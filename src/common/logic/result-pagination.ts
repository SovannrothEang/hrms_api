export class ResultPagination<T> {
    public readonly data: T[];
    public readonly total: number;
    public readonly page: number;
    public readonly limit: number;
    public readonly totalPages: number;

    constructor(data: T[], total: number, page: number, limit: number) {
        this.data = data;
        this.total = total;
        this.page = page;
        this.limit = limit;
        this.totalPages = Math.ceil(total / limit);
    }

    public static of<U>(
        data: U[],
        total: number,
        page: number,
        limit: number,
    ): ResultPagination<U> {
        return new ResultPagination<U>(data, total, page, limit);
    }
}

export class PaginationOption {
    public page?: number = 1;
    public pageSize?: number = 10;
    public startDate?: Date;
    public endDate?: Date;
}
