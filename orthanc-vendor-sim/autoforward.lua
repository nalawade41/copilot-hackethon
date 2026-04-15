-- Auto-forward: every new stable study is pushed to the Copilot gateway
-- via BOTH protocols as SEPARATE studies. Each gets a unique StudyInstanceUID
-- and a tagged description so they appear as two distinct entries in Copilot —
-- one showing "DIMSE C-STORE (TCP)" and one showing "STOW-RS (HTTP)".

function OnStableStudy(studyId, tags, metadata)
  local study = ParseJson(RestApiGet('/studies/' .. studyId))
  local originalDesc = ''
  if study['MainDicomTags'] and study['MainDicomTags']['StudyDescription'] then
    originalDesc = study['MainDicomTags']['StudyDescription']
  end

  local patientName = ''
  if study['PatientMainDicomTags'] and study['PatientMainDicomTags']['PatientName'] then
    patientName = study['PatientMainDicomTags']['PatientName']
  end

  -- === PUSH 1: DIMSE C-STORE (TCP) ===
  local dimseModify = {
    Replace = {
      StudyDescription = '[DIMSE C-STORE (TCP)] ' .. originalDesc,
      PatientName = patientName .. ' [TCP Push]'
    },
    Force = true,
    KeepSource = true
  }
  local dimseResult = ParseJson(RestApiPost('/studies/' .. studyId .. '/modify', DumpJson(dimseModify, true)))
  local dimseModifiedId = dimseResult['ID']

  PrintRecursive('[autoforward] Pushing via DIMSE C-STORE (TCP)...')
  SendToModality(dimseModifiedId, 'copilot-gateway-dimse')
  PrintRecursive('[autoforward] DIMSE push complete')
  RestApiDelete('/studies/' .. dimseModifiedId)

  -- === PUSH 2: STOW-RS (HTTP POST) ===
  local stowModify = {
    Replace = {
      StudyDescription = '[STOW-RS (HTTP)] ' .. originalDesc,
      PatientName = patientName .. ' [HTTP Push]'
    },
    Force = true,
    KeepSource = true
  }
  local stowResult = ParseJson(RestApiPost('/studies/' .. studyId .. '/modify', DumpJson(stowModify, true)))
  local stowModifiedId = stowResult['ID']

  PrintRecursive('[autoforward] Pushing via STOW-RS (HTTP)...')
  SendToPeer(stowModifiedId, 'copilot-gateway-http')
  PrintRecursive('[autoforward] STOW-RS push complete')
  RestApiDelete('/studies/' .. stowModifiedId)

  PrintRecursive('[autoforward] Both protocols pushed as separate studies')
end
