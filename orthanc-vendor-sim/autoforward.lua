-- Auto-forward: every new stable study is pushed to the Copilot gateway
-- via BOTH protocols as SEPARATE studies, each tagged in the description.
--
-- Two important details:
--
-- 1. Recursion guard: when we modify a study, the new copy ALSO becomes
--    stable later, which would re-trigger this script and cause infinite
--    forwarding loops. We detect already-tagged studies and skip them.
--
-- 2. Synchronous send via REST API: the Lua helpers SendToModality /
--    SendToPeer queue ASYNC jobs that often fail with "Unknown resource"
--    when the receiver tries to read the source after the script returned.
--    Using POST /modalities/{name}/store with a synchronous JSON body
--    blocks until the transfer completes — far more reliable.

local TAG_DIMSE = '[DIMSE C-STORE (TCP)]'
local TAG_STOW = '[STOW-RS (HTTP)]'

function OnStableStudy(studyId, tags, metadata)
  local study = ParseJson(RestApiGet('/studies/' .. studyId))
  local originalDesc = ''
  if study['MainDicomTags'] and study['MainDicomTags']['StudyDescription'] then
    originalDesc = study['MainDicomTags']['StudyDescription']
  end

  -- Recursion guard: if this study already has one of our protocol tags,
  -- it's a modified copy we created earlier — skip it.
  if string.find(originalDesc, TAG_DIMSE, 1, true)
      or string.find(originalDesc, TAG_STOW, 1, true) then
    PrintRecursive('[autoforward] Skipping already-tagged study ' .. studyId)
    return
  end

  PrintRecursive('[autoforward] Forwarding new study ' .. studyId)

  -- === PUSH 1: DIMSE C-STORE (TCP) ===
  local dimseModify = {
    Replace = { StudyDescription = TAG_DIMSE .. ' ' .. originalDesc },
    Force = true,
    KeepSource = true,
    Synchronous = true
  }
  local dimseResult = ParseJson(RestApiPost('/studies/' .. studyId .. '/modify', DumpJson(dimseModify, true)))
  local dimseModifiedId = dimseResult['ID']
  PrintRecursive('[autoforward] Pushing ' .. dimseModifiedId .. ' via DIMSE C-STORE (TCP)...')
  -- Synchronous store: blocks until complete; surfaces errors immediately.
  RestApiPost('/modalities/copilot-gateway-dimse/store', dimseModifiedId, true)
  PrintRecursive('[autoforward] DIMSE push done')

  -- === PUSH 2: STOW-RS (HTTP POST) ===
  local stowModify = {
    Replace = { StudyDescription = TAG_STOW .. ' ' .. originalDesc },
    Force = true,
    KeepSource = true,
    Synchronous = true
  }
  local stowResult = ParseJson(RestApiPost('/studies/' .. studyId .. '/modify', DumpJson(stowModify, true)))
  local stowModifiedId = stowResult['ID']
  PrintRecursive('[autoforward] Pushing ' .. stowModifiedId .. ' via STOW-RS (HTTP)...')
  RestApiPost('/peers/copilot-gateway-http/store', stowModifiedId, true)
  PrintRecursive('[autoforward] STOW-RS push done')
end
