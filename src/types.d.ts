export type CompilerResult = {
	SetGlobalVariablesInstruction: number
	ClearGlobalVariablesInstruction: number
	CompiledCode: Instruction[]
	DebugInfo: DebugInfo[]
	Functions: Function[]
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

export type Interpeter2 = {
	State: InterpeterState
}

export type Interpeter = {
	BasePointer: number
	CodePointer: number
	StackMemorySize: number
	Stack: DataItem[]
	Heap: DataItem[]
	CallStack: string[]
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
} | {
	type: "comp/res"
	data: CompilerResult
} | {
	type: "intp-data"
	data: Interpeter
} | {
	type: "intp2-data"
	data: Interpeter2
}