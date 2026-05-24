const defaultCode = (statusCode: number): string => {
    const map: { [key: number]: string } = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        409: "CONFLICT",
        422: "VALIDATION_ERROR",
        500: "INTERNAL_ERROR",
    };
    return map[statusCode] || "ERROR";
};

export default class AppError extends Error {
    statusCode: number;
    code: string;
    status: string;
    isOperational: boolean;
    constructor(message: string, statusCode: number, code?: string) {
        super(message);
        this.statusCode = statusCode;
        this.code = code || defaultCode(statusCode);
        this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}