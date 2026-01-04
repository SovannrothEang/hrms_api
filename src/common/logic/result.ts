export class Result<T> {
    public readonly isSuccess: boolean;
    public readonly error: string | null;
    private readonly data: T | null;

    private constructor(isSuccess: boolean, error?: string, value?: T) {
        this.isSuccess = isSuccess;
        this.error = error || null;
        this.data = value || null;
    }

    public getData(): T {
        if (!this.isSuccess) throw new Error('Cannot get value of error result.');
        return this.data!;
    }

    public static ok<U>(value?: U): Result<U> {
        return new Result<U>(true, undefined, value);
    }

    public static fail<U>(error: string): Result<U> {
        return new Result<U>(false, error);
    }

    public static notFound(message = 'Resource not found'): Result<any> {
        return new Result(false, message);
    }
}