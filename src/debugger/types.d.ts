export type CompilerResult = {
	DebugInfo: DebugInfo[]
}

export type Context = {
	CodePointer: number
	CallStack: string[]
}

export type Instruction = {
	Opcode: string
	Parameter: DataItem
	Tag: string
}

export type Position = {
	StartLine: number
	StartChar: number

	EndLine: number
	EndChar: number

	StartTotal: number
	EndTotal: number
}

export type DebugInfo = {
	StartOffset: number
	EndOffset: number
	Position: Position
}

export type InterpeterState = 'Initialized' | 'Destroyed' | 'SetGlobalVariables' | 'CallCodeEntry' | 'CallUpdate' | 'CallCodeEnd' | 'DisposeGlobalVariables' | 'CodeExecuted'

export type CallStackFrame = ({
    IsState: true;
    Name: string;
} | {
    IsState: false;
    Name: string;
    File: string;
    Offset: number;
    Line: number;
})

export type Stack = {
	StackMemorySize: number
	Stack: DataItem[]
}

export type DataItem = {
	Value: string | 'null'
	Type: 'INT' | 'FLOAT' | 'BYTE' | 'CHAR'
	Tag: string | null
}

export type Function = {
	FullName: string
	Position: Position
}

export type BaseIpcMessage_In<T> = {
	type: AllAndCoreMessages_In
	id: string
	reply: string | null
	data: T
}

export type BaseIpcMessage_Out<T> = {
	type: AllAndCoreMessages_Out
	id: string
	reply: string | null
	data: T
}

export type Message_In = {
	type: "console/out"
	data: { Message: string, Type: 'System' | 'Normal' | 'Warning' | 'Error' | 'Debug', Context: Context }
} | {
	type: "stdout"
	data: string
} | {
	type: "stderr"
	data: string
} | {
	type: DebuggerMessages_In
	data: any
}

export type Message_Out = {
	type: "stdin"
	data: string
} | {
	type: DebuggerMessages_Out
	data: any
}

export type DebuggerMessages_In =
	"interpreter/updated" |
	"compiler/debuginfo" |
	"compiler/code" |
	"interpreter/details" |
	"interpreter/registers" |
	"interpreter/stack" |
	"interpreter/state" |
	"interpreter/callstack"

export type DebuggerMessages_Out =
	"base/ping/req" |
	"debug/step" |
	"debug/stepinto" |
	"interpreter/tick" |
	"compiler/debuginfo" |
	"compiler/code" |
	"interpreter/details" |
	"interpreter/registers" |
	"interpreter/stack" |
	"interpreter/state" |
	"interpreter/callstack"

export type AllMessages_In =
	DebuggerMessages_In |
	"interpreter/updated" |
	"compiler/debuginfo" |
	"compiler/code" |
	"interpreter/details" |
	"interpreter/registers" |
	"interpreter/stack" |
	"interpreter/state" |
	"interpreter/callstack" 

export type AllMessages_Out =
	DebuggerMessages_Out |
	"debug/step" |
	"debug/stepinto" |
	"interpreter/tick" |
	"compiler/debuginfo" |
	"compiler/code" |
	"interpreter/details" |
	"interpreter/registers" |
	"interpreter/stack" |
	"interpreter/state" |
	"interpreter/callstack" |
	"eval" |
	"stdin"

export type AllAndCoreMessages_In =
	AllMessages_In |
	"base/ping/req" |
	"base/ping/res"

export type AllAndCoreMessages_Out =
	AllMessages_Out |
	"base/ping/req" |
	"base/ping/res"
