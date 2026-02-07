export class ResultPagination<T, S = undefined> {
    public readonly data: T[];
    public readonly meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNext: boolean;
        hasPrevious: boolean;
    };
    public readonly summary?: S;

    constructor(
        data: T[],
        total: number,
        page: number,
        limit: number,
        summary?: S,
    ) {
        const totalPages = Math.ceil(total / limit);
        this.data = data;
        this.meta = {
            total,
            page,
            limit,
            totalPages,
            hasNext: page < totalPages,
            hasPrevious: page > 1,
        };
        this.summary = summary;
    }

    public static of<U, V = undefined>(
        data: U[],
        total: number,
        page: number,
        limit: number,
        summary?: V,
    ): ResultPagination<U, V> {
        return new ResultPagination<U, V>(data, total, page, limit, summary);
    }
}

export class PaginationOption {
    public page?: number = 1;
    public pageSize?: number = 10;
    public startDate?: Date;
    public endDate?: Date;
}
