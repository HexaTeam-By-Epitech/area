import { Field } from "./fields.type";

export interface Reactions {
    run(userId: string, params: any): Promise<void>;
    getFields(): [Field]
}
