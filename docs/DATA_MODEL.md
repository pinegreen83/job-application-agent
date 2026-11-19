# 데이터 모델 및 상태 명세 v0.2

**상태:** 논리 모델 제안. 실제 SQLite schema와 제약은 설계 PR에서 확정한다. 모든 영구 레코드는 사용자 PC에 저장한다.

M0-C의 승인된 예외는 [합성 저장 검증 테이블](M0_C_SQLITE.md) 하나다. 아래 제품 엔터티를 구현하거나 확정한 것으로 간주하지 않는다.

## 주요 엔터티
| 엔터티 | 핵심 필드(논리 모델) | 관계/주의사항 |
|---|---|---|
| `MailInput` | id, inputMode, receivedAt?, importedAt, localSourceRef, hash, parseStatus | 한 통에 여러 공고 |
| `JobPosting` | id, platform, externalJobId?, company, title, canonicalUrl?, deadline?, jdLocalRef?, extractionStatus, firstSeenAt, lastSeenAt | 공고 하나를 대표. 동일 회사의 다른 공고는 별개 |
| `JobOccurrence` | jobId, mailInputId, foundAt, url, rawCardMetadata | 중복 메일에 나타난 횟수·출처 기록 |
| `JobRequirement` | jobId, category, text, requiredLevel, evidenceRef, verificationStatus | 미확인 요건 임의 확정 금지 |
| `ProfileDocument` | id, documentType, version, localPath, checksum, importedAt, verificationStatus | 원본을 편집 결과와 분리 |
| `ExperienceEvidence` | id, documentId, version, episodeId?, factStatus, role, verifiedClaim, sourceLocation, tags | 확정/회상/불확실/금지와 개인·팀 역할 구분 |
| `EvidenceChunk` | id, documentId, version, searchText, sourceSpan, indexVersion | 근거 검색 출처 재현 |
| `TargetFieldSelection` | id, field, revision, selectedAt | 선택 분야 입력/변경 이력. 단일·다중 선택과 분야 체계는 SPEC-007 착수 전에 확정 |
| `SuitabilityAnalysis` | id, jobId, profileSnapshot, targetFieldRevision, modelVersion, eligibility, roleFit, fieldRelevance, summary, evidenceRefs, unknowns, evaluatedAt | 필수 자격·경험 평가와 분야 중심 정렬 근거 구분; 재평가 기록 보존 |
| `JobWorkflow` | jobId, triageStatus, selectedSupportType, updatedAt, notes | 미검토/검토/보류/지원준비 등 |
| `ApplicationDraft` | id, jobId, draftType(resume 또는 custom_form), sourceVersions, bodyRef, revision, generatedAt, providerInfo, promptVersion, evidenceIds | 개인 마스터 문서와 별도 |
| `AIReview` | id, draftId, draftRevision, reviewerProvider, findings, status, reviewedAt | 독립 검토 결과; 사람의 승인과 다름 |
| `HumanDecision` | id, draftId, revision, decision(approved/rejected/edited), approvedHash?, notes, decidedAt | 이후 변경 시 승인 무효 |
| `SubmissionBundle` | id, jobId, approvedHash, resumeRef?, portfolioRefs[], answers[], applicationUrl, preparedAt | 사용자가 직접 제출할 자료 |
| `ApplicationRecord` | id, jobId, bundleId, userReportedSubmittedAt?, status, verificationNote?, currentStage | '본인이 제출 완료 표시'와 확인 근거 구분 |
| `SubmittedArtifact` | id, applicationId, filePath, mimeType, checksum, isActualSubmittedCopy, addedAt | 최종 제출 PDF 등, **로컬에만** 보관 |
| `StageHistory` | id, applicationId, fromStage, toStage, changedAt, source, notes | 수동 갱신 기본 |
| `ReminderLog` | id, applicationId?, scheduledFor, shownAt?, actionTaken? | OS 알림 실패/누락 구분 |
| `ProviderConfig` | id, providerType, modelId?, secretHandle?, connectionStatus | 키 자체 저장 금지, OS 보안 저장소 핸들만 |

최초 릴리스에는 별도 개인 선호 엔터티나 `preferenceFit` 평가를 두지 않는다. 선택 분야는 공고 탐색의 기본 기준으로 유지한다. JD 원본/수정 이력(FR-002-02/05), 문항별 제약(FR-009-02/04), 자료 패키지 승인 해시의 첨부 포함 범위(FR-005-03)는 각 설계 PR에서 저장 구조와 제약을 확정한다. 문서 삭제 후 과거 근거 보존/완전 삭제 정책과 자동 재평가 정책은 미정이며 임의로 결정하지 않는다.

## 업무 상태 후보 (미확정)
- 공고: `NEW → REVIEWING → INTERESTED → PREPARING → READY_TO_SUBMIT` 또는 `ON_HOLD` / `DISMISSED`.
- 지원서: `DRAFTED → AI_REVIEWED → HUMAN_REVIEW_PENDING → HUMAN_APPROVED`; 내용 변경 시 `HUMAN_REVIEW_PENDING`으로 되돌림.
- 제출: 앱이 외부 제출을 실행하지 않음. 사용자의 직접 제출 이후 `USER_MARKED_SUBMITTED`; 제출 근거가 추가되면 `SUBMISSION_DOCUMENT_ATTACHED`. 이것과 플랫폼의 실제 처리 성공 여부는 별개.
- 전형: `APPLIED`, `DOCUMENT_SCREENING`, `TEST`, `INTERVIEW`, `OFFER`, `REJECTED`, `WITHDRAWN` 등은 추후 사용자와 확정.

## 불변 조건
- INV-01 한 메일의 공고가 여러 개인 경우 각각의 고유 공고 ID와 출처가 추적되어야 한다.
- INV-02 플랫폼 공고 ID/정규화 URL이 같으면 중복 연결; 이름만 같아서는 자동 병합 금지. 식별자 불명확하면 검토 대상으로 남긴다.
- INV-03 개인 자료의 **사용 금지** 사실은 추천/생성의 긍정 근거로 사용할 수 없다.
- INV-04 채용 필수조건이 모호하면 `unknown`, 미충족이 명확하면 `unmet`으로 구분한다.
- INV-05 사용자 승인과 AI 리뷰는 서로 다른 독립 상태다. AI가 승인해도 최종 제출 허가는 아니다.
- INV-06 승인한 지원서가 수정되면 기존 승인 해시가 무효화된다.
- INV-07 직접 제출 화면으로 안내했다고 `USER_MARKED_SUBMITTED`가 되지 않는다.
- INV-08 최종 제출한 PDF와 생성 초안을 다른 버전/용도로 보존한다.
- INV-09 모든 데이터는 로컬 저장되며 외부 LLM 송신은 별도 명시된 처리 행위다.
