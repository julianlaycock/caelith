import { FundStructure, CreateFundStructureInput, UpdateFundStructureInput } from '../models/index.js';
export declare function createFundStructure(input: CreateFundStructureInput): Promise<FundStructure>;
export declare function findFundStructureById(id: string): Promise<FundStructure | null>;
export declare function findAllFundStructures(): Promise<FundStructure[]>;
export declare function findFundStructuresByDomicile(domicile: string): Promise<FundStructure[]>;
export declare function updateFundStructure(id: string, input: UpdateFundStructureInput): Promise<FundStructure | null>;
//# sourceMappingURL=fund-structure-repository.d.ts.map