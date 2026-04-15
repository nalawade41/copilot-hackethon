-- Auto-forward: every new stable study is pushed to the Copilot gateway
-- via BOTH protocols as SEPARATE studies. Each gets a unique
-- StudyInstanceUID and a tagged StudyDescription so they appear as
-- distinct entries in Copilot's PACS list.
--
-- NOTE: SendToModality and SendToPeer are ASYNCHRONOUS — they queue jobs
-- that run after this function returns. We deliberately DO NOT delete
-- the modified copies here, because the jobs would fail with
-- "Unknown resource". The modified copies stick around in this vendor
-- sim's local Orthanc storage; that's fine for a demo.
--
-- We only modify study-level tags (StudyDescription). Patient-level tags
-- can't be changed via /studies/.../modify when the patient has multiple
-- studies — Orthanc rejects that.

function OnStableStudy(studyId, tags, metadata)
  local study = ParseJson(RestApiGet('/studies/' .. studyId))
  local originalDesc = ''
  if study['MainDicomTags'] and study['MainDicomTags']['StudyDescription'] then
    originalDesc = study['MainDicomTags']['StudyDescription']
  end

  -- === PUSH 1: DIMSE C-STORE (TCP) ===
  local dimseModify = {
    Replace = {
      StudyDescription = '[DIMSE C-STORE (TCP)] ' .. originalDesc
    },
    Force = true,
    KeepSource = true
  }
  local dimseResult = ParseJson(RestApiPost('/studies/' .. studyId .. '/modify', DumpJson(dimseModify, true)))
  local dimseModifiedId = dimseResult['ID']

  PrintRecursive('[autoforward] Queueing DIMSE C-STORE (TCP) push for ' .. dimseModifiedId)
  SendToModality(dimseModifiedId, 'copilot-gateway-dimse')

  -- === PUSH 2: STOW-RS (HTTP POST) ===
  local stowModify = {
    Replace = {
      StudyDescription = '[STOW-RS (HTTP)] ' .. originalDesc
    },
    Force = true,
    KeepSource = true
  }
  local stowResult = ParseJson(RestApiPost('/studies/' .. studyId .. '/modify', DumpJson(stowModify, true)))
  local stowModifiedId = stowResult['ID']

  PrintRecursive('[autoforward] Queueing STOW-RS (HTTP) push for ' .. stowModifiedId)
  SendToPeer(stowModifiedId, 'copilot-gateway-http')

  PrintRecursive('[autoforward] Both push jobs queued. Check JOBS-WORKER logs for completion.')
end
