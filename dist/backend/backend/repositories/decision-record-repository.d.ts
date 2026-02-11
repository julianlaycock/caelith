import { DecisionRecord, CreateDecisionRecordInput } from '../models/index.js';
export declare function createDecisionRecord(input: CreateDecisionRecordInput): Promise<DecisionRecord>;
export declare function findDecisionRecordById(id: string): Promise<DecisionRecord | null>;
export declare function findDecisionsByAsset(assetId: string): Promise<DecisionRecord[]>;
export declare function findDecisionsBySubject(subjectId: string): Promise<DecisionRecord[]>;
//# sourceMappingURL=decision-record-repository.d.ts.map