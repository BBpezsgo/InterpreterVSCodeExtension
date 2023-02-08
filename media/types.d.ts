export type CompilerResult = {
	SetGlobalVariablesInstruction: number
	ClearGlobalVariablesInstruction: number
	CompiledCode: Instruction[]
}

export type Instruction = {
	Opcode: string
	Parameter: string | number | boolean | null
	ParameterIsComplicated: boolean
	Tag: string
	AdditionParameter: string
	AdditionParameter2: number
}

export type Interpeter2 = {
	State: 'Initialized' | 'Destroyed' | 'SetGlobalVariables' | 'CallCodeEntry' | 'CallUpdate' | 'CallCodeEnd' | 'DisposeGlobalVariables' | 'CodeExecuted'
}

export type Interpeter = {
	BasePointer: number
	CodePointer: number
	StackMemorySize: number
	Stack: DataItem[]
	Heap: DataItem[]
}

export type DataItem = {
	Value: string | 'null'
	Type: 'INT' | 'FLOAT' | 'STRING' | 'BOOLEAN' | 'STRUCT' | 'LIST' | 'RUNTIME'
	Tag: string | null
	IsHeapAddress: boolean
}

export type Listener<T> = (data: T) => void

export type Listeners = {
	"con-out": Listener<{ Message: string, Type: 'System' | 'Normal' | 'Warning' | 'Error' | 'Debug' }> | undefined
	"stdout": Listener<string> | undefined
	"stderr": Listener<string> | undefined
	"comp-res": Listener<CompilerResult> | undefined
	"intp-data": Listener<Interpeter> | undefined
	"intp2-data": Listener<Interpeter2> | undefined
}