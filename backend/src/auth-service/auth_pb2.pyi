from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from typing import ClassVar as _ClassVar, Optional as _Optional

DESCRIPTOR: _descriptor.FileDescriptor

class Credentials(_message.Message):
    __slots__ = ("x", "y")
    X_FIELD_NUMBER: _ClassVar[int]
    Y_FIELD_NUMBER: _ClassVar[int]
    x: str
    y: str
    def __init__(self, x: _Optional[str] = ..., y: _Optional[str] = ...) -> None: ...

class Reply(_message.Message):
    __slots__ = ("x",)
    X_FIELD_NUMBER: _ClassVar[int]
    x: bool
    def __init__(self, x: bool = ...) -> None: ...
