export async function withTrace(name: string, fn: ()=>Promise<any>) { return fn(); }
