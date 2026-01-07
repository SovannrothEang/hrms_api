export enum LeaveStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    CANCELLATION_PENDING = 'CANCELLATION_PENDING',
    CANCELED = 'CANCELED',
    REVOKED = 'REVOKED',
    ON_HOLD = 'ON_HOLD',
}

// Pending: The request has been successfully submitted and is currently in the approver's queue for review.
// Approved: The authorized manager or system has officially granted the time off.The leave balance is typically updated at this stage.
// Rejected / Denied: The request was not granted by the approver.Leave balances are usually not deducted for rejected requests.
// Cancellation Pending: An employee has requested to cancel a previously approved leave, which now requires a second approval to be finalized.
// Canceled: The request was withdrawn by the employee(if still pending) or the cancellation was approved.
// Revoked: The approver has withdrawn their previous approval of a request.
// On Hold: The request is being kept for further deliberation or requires more information before it can be approved or rejected. 