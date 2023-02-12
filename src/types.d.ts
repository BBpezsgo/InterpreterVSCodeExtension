export type CompilerResult = {
	DebugInfo: DebugInfo[]
}

export type Context = {
	CodePointer: number
	CallStack: string[]
}

export type Instruction = {
	Opcode: string
	Parameter: string | number | boolean | null
	ParameterIsComplicated: boolean
	Tag: string
	AdditionParameter: string
	AdditionParameter2: number
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
	Type: 'INT' | 'FLOAT' | 'STRING' | 'BOOLEAN' | 'STRUCT' | 'LIST' | 'RUNTIME'
	Tag: string | null
	IsHeapAddress: boolean
}

export type Function = {
	FullName: string
	Position: Position
}

export type BaseIpcMessage<T> = {
	type: string
	id: string
	reply: string | null
	data: T
}

export type IpcMessage = {
	type: "console/out"
	data: { Message: string, Type: 'System' | 'Normal' | 'Warning' | 'Error' | 'Debug', Context: Context }
} | {
	type: "stdout"
	data: string
} | {
	type: "stderr"
	data: string
}