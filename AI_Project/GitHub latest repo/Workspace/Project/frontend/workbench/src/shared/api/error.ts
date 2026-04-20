export class ApiError extends Error {
  readonly status: number
  readonly payload: unknown
  readonly title: string | null
  readonly detail: string | null
  readonly dependency: string | null
  readonly condition: string | null
  readonly dependencyType: string | null
  readonly retryable: boolean | null
  readonly isSchemaValidationFailure: boolean

  constructor(
    message: string,
    status: number,
    payload: unknown = null,
    options: {
      title?: string | null
      detail?: string | null
      dependency?: string | null
      condition?: string | null
      dependencyType?: string | null
      retryable?: boolean | null
      isSchemaValidationFailure?: boolean
    } = {},
  ) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.payload = payload
    this.title = options.title ?? null
    this.detail = options.detail ?? null
    this.dependency = options.dependency ?? null
    this.condition = options.condition ?? null
    this.dependencyType = options.dependencyType ?? null
    this.retryable = options.retryable ?? null
    this.isSchemaValidationFailure = options.isSchemaValidationFailure ?? false
  }
}
