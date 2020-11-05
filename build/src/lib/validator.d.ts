import { Config } from '../Config';
declare const validator: {
    validate(config: Config, workflow: any): string | null;
};
export { validator };
