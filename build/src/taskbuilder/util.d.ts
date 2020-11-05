export interface DirState {
    files: string[];
    dirs: string[];
    hasIndex: boolean;
}
declare let genUtil: {
    serializeArgs(args: Object | null): string;
    seperateDirFiles(fileExts: string[], state: any, file: string, cb: any): void;
    readDirectory(dir: string, cb: (err: Error | null, dirState: DirState | null) => any): void;
};
export { genUtil };
