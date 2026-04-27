class DomainError(Exception):
    def __init__(self, code: str, title: str, detail: str, status_code: int) -> None:
        self.code = code
        self.title = title
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)
