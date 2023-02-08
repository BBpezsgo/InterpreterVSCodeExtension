// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.

function Main() {
    const vscode = acquireVsCodeApi()
    console.log('Initial state', vscode.getState())

    // Handle messages sent from the extension to the webview
    window.addEventListener('message', event => {
        /** @type { { command: string, payload: any | undefined }} */
        const message = event.data
        console.log(message)
        // @ts-ignore
        if (events[message.command]) {
            try {
                // @ts-ignore
                events[message.command](message.payload)
            } catch (/** @type {any} */ error) {
                if (error instanceof Error) {
                    vscode.postMessage({
                        command: 'alert',
                        text: error.message + '\n' + error.stack
                    })
                } else {
                    vscode.postMessage({
                        command: 'alert',
                        text: error
                    })
                }
            }
        }
    })

    /** @type {import("./types").Instruction[]} */
    let CompiledCode = []

    /** @type {import("./types").Listeners} */
    const events = {
        'comp-res': CompilerResult => {
            CompiledCode = CompilerResult.CompiledCode
            const eContentCode = document.querySelector('#code-content ul')
            if (!eContentCode) return
            eContentCode.innerHTML = ''
            var indent = 0
            for (let i = 0; i < CompilerResult.CompiledCode.length; i++) {
                if (CompilerResult.ClearGlobalVariablesInstruction === i) {
                    const newItem = document.createElement('li')
                    newItem.appendChild(CreateSpan('ClearGlobalVariables:', 'c-label'))
                    eContentCode.appendChild(newItem)
                }

                if (CompilerResult.SetGlobalVariablesInstruction === i) {
                    const newItem = document.createElement('li')
                    newItem.appendChild(CreateSpan('SetGlobalVariables:', 'c-label'))
                    eContentCode.appendChild(newItem)
                }

                {
                    const instruction = CompilerResult.CompiledCode[i]
                    const newItem = document.createElement('li')
                    newItem.classList.add('c-code')
                    newItem.id = 'c-code-i-' + i

                    newItem.appendChild(CreateCodicon('debug-stackframe'))

                    const lineNumber = CreateSpan(i.toString(), 'c-line-number')

                    const breakpointButton = CreateCodicon('circle-filled')
                    breakpointButton.classList.add('breakpoint')
                    breakpointButton.style.color = '#e51400'

                    newItem.appendChild(breakpointButton)
                    newItem.appendChild(lineNumber)

                    const newSpan = CreateSpan('', '')

                    if (instruction.Opcode === 'COMMENT') {
                        if (instruction.Parameter?.toString().endsWith('}') && !instruction.Parameter?.toString().endsWith('{ }')) {
                            indent--
                        }
                        newSpan.style.paddingLeft = (indent * 8) + 'px'
                        newSpan.appendChild(CreateSpan(instruction.Parameter ?? '', 'c-comment'))
                        if (instruction.Parameter?.toString().endsWith('{')) {
                            indent++
                        }
                    } else {
                        newSpan.style.paddingLeft = (indent * 8 + 2) + 'px'
                        newSpan.appendChild(CreateSpan(instruction.Opcode, 'c-opcode'))

                        /** @type {HTMLSpanElement | null} */
                        var valueSpan = null

                        if (typeof instruction.Parameter === 'number') {
                            valueSpan = CreateSpan(instruction.Parameter, 'c-num')
                        } else if (typeof instruction.Parameter === 'string') {
                            if (instruction.ParameterIsComplicated) {
                                valueSpan = CreateSpan(instruction.Parameter, '')
                            } else {
                                valueSpan = CreateSpan('"' + instruction.Parameter + '"', 'c-str')
                            }
                        } else if (typeof instruction.Parameter === 'boolean') {
                            valueSpan = CreateSpan(instruction.Parameter, 'c-bool')
                        } else {
                            valueSpan = CreateSpan(instruction.Parameter ?? '', 'c-param')
                        }

                        if (instruction.ParameterIsComplicated) {
                            valueSpan.classList.add('c-too-complicated')
                            valueSpan.title = 'Too complicated value'
                        }

                        if (instruction.Opcode === 'JUMP_BY_IF_FALSE' || instruction.Opcode === 'JUMP_BY_IF_TRUE' || instruction.Opcode === 'JUMP_BY' || instruction.Opcode === 'CALL') {
                            if (typeof instruction.Parameter === 'number') {
                                valueSpan.addEventListener('mouseenter', (e) => {
                                    // @ts-ignore
                                    document.getElementById('c-code-i-' + (instruction.Parameter + i))?.classList.add('c-jump-to-target')
                                })
                                valueSpan.addEventListener('mouseleave', (e) => {
                                    // @ts-ignore
                                    document.getElementById('c-code-i-' + (instruction.Parameter + i))?.classList.remove('c-jump-to-target')
                                })
                                valueSpan.addEventListener('click', (e) => {
                                    // @ts-ignore
                                    e.target?.classList.add('c-jump-to-from-stay')
                                    // @ts-ignore
                                    document.getElementById('c-code-i-' + (instruction.Parameter + i))?.classList.add('c-jump-to-target-stay')
                                    // @ts-ignore
                                    document.getElementById('c-code-i-' + (instruction.Parameter + i))?.scrollIntoView({ behavior: 'smooth' })
                                })
                                valueSpan.title = 'Scroll to target'
                                valueSpan.classList.add('c-jump-to-from')

                                const newIcon = document.createElement('i')
                                if (instruction.Parameter > 0) {
                                    newIcon.className = 'fa-solid fa-turn-down'
                                } else {
                                    newIcon.className = 'fa-solid fa-turn-up'
                                }
                                valueSpan.appendChild(newIcon)
                            }
                        }

                        newSpan.appendChild(valueSpan)

                        const GetStackInfo = function () {
                            const basePointerValueElement = document.getElementById('stack-base-pointer-value')
                            if (!basePointerValueElement)
                                return null
                            const stackContentTable = document.querySelector('#stack-content>table')
                            if (!stackContentTable)
                                return null
                            const basePointerValueText = basePointerValueElement.textContent ?? ''

                            const stackSize = stackContentTable.childElementCount - 1
                            const basePointer = Number.parseInt(basePointerValueText)

                            return {
                                size: stackSize,
                                basePointer: basePointer
                            }
                        }

                        /** @param {number} itemIndex @param {HTMLElement} element */
                        const HiglightStackItem = function (itemIndex, element) {
                            element.setAttribute('stack-higlighted-index', itemIndex.toString())
                            element.classList.add('stack-higlighted-index-' + itemIndex)

                            const stackItem = document.getElementById('stack-row-i-' + itemIndex)
                            if (stackItem === null || stackItem === undefined) {
                                element.classList.add('stack-higlighted-error')
                                element.title = 'Stack element not exists'
                            } else {
                                stackItem.classList.add('stack-item-higlighted')
                                element.classList.add('stack-higlighted')
                                element.title = ''
                            }
                        }
                        /** @param {HTMLElement} element */
                        const NoHiglightStackItem = function (element) {
                            if (element.hasAttribute('stack-higlighted-index') !== true) { return }
                            const higlightedIndex = Number.parseInt(element.getAttribute('stack-higlighted-index') || '-1')
                            element.classList.remove('stack-higlighted-index-' + higlightedIndex)

                            const stackItem = document.getElementById('stack-row-i-' + higlightedIndex)
                            if (stackItem === null || stackItem === undefined) {
                            } else {
                                stackItem.classList.remove('stack-item-higlighted')
                            }
                            element.classList.remove('stack-higlighted')
                            element.classList.remove('stack-higlighted-error')
                            element.title = ''
                        }

                        if (instruction.Opcode === 'LOAD_VALUE' || instruction.Opcode === 'STORE_VALUE') {
                            newSpan.addEventListener('mouseenter', (/** @type {any} */ e) => {
                                // @ts-ignore
                                HiglightStackItem(instruction.Parameter, newItem)
                            })
                            newSpan.addEventListener('mouseleave', (/** @type {any} */ e) => {
                                NoHiglightStackItem(newItem)
                            })

                            const newIcon = document.createElement('i')
                            newIcon.className = 'fa-solid fa-database'
                            newSpan.appendChild(newIcon)
                        } else if (instruction.Opcode === 'LOAD_VALUE_BR' || instruction.Opcode === 'STORE_VALUE_BR') {
                            newSpan.addEventListener('mouseenter', (/** @type {any} */ e) => {
                                const stack = GetStackInfo()
                                // @ts-ignore
                                HiglightStackItem(instruction.Parameter + stack.basePointer, newItem)
                            })
                            newSpan.addEventListener('mouseleave', (/** @type {any} */ e) => {
                                NoHiglightStackItem(newItem)
                            })

                            const newIcon = document.createElement('i')
                            newIcon.className = 'fa-solid fa-database'
                            newSpan.appendChild(newIcon)
                        } else if (instruction.Opcode === 'LOAD_VALUE_R' || instruction.Opcode === 'STORE_VALUE_R') {
                            newSpan.addEventListener('mouseenter', (/** @type {any} */ e) => {
                                const stack = GetStackInfo()
                                // @ts-ignore
                                HiglightStackItem(instruction.Parameter + stack.size, newItem)
                            })
                            newSpan.addEventListener('mouseleave', (/** @type {any} */ e) => {
                                NoHiglightStackItem(newItem)
                            })

                            const newIcon = document.createElement('i')
                            newIcon.className = 'fa-solid fa-database'
                            newSpan.appendChild(newIcon)
                        }

                        if (instruction.AdditionParameter !== '' && instruction.AdditionParameter) {
                            newSpan.appendChild(CreateSpan('"' + instruction.AdditionParameter + '"', 'c-str'))
                        }

                        if (instruction.AdditionParameter2 !== -1 && instruction.AdditionParameter) {
                            newSpan.appendChild(CreateSpan(instruction.AdditionParameter, 'c-num'))
                        }
                    }

                    if (instruction.Tag && instruction.Tag !== '') {
                        newSpan.appendChild(CreateSpan(instruction.Tag, 'c-label-tag'))
                    }

                    document.body.addEventListener('mouseup', (e) => {
                        const list0 = document.getElementsByClassName('c-jump-to-target-stay')
                        const list1 = document.getElementsByClassName('c-jump-to-target')
                        const list2 = document.getElementsByClassName('c-jump-to-from-stay')
                        for (let i = 0; i < list0.length; i++) { list0[i].classList.remove('c-jump-to-target-stay') }
                        for (let i = 0; i < list1.length; i++) { list1[i].classList.remove('c-jump-to-target') }
                        for (let i = 0; i < list2.length; i++) { list2[i].classList.remove('c-jump-to-from-stay') }
                    }, true)

                    newItem.appendChild(newSpan)
                    eContentCode.appendChild(newItem)
                }
            }
        },
        'con-out': LogMessage => {

        },
        'stdout': Message => {

        },
        'stderr': Error => {

        },
        'intp-data': Interpeter => {
            if (!document) return

            // @ts-ignore
            // document.getElementById('stack-memory-used').innerText = Interpeter.StackMemorySize.toString()
            // @ts-ignore
            // document.getElementById('stack-base-pointer-value').innerText = Interpeter.BasePointer.toString()

            const eContentCode = document.querySelector('#code-content ul')

            if (!eContentCode) return

            const codeChildCount = eContentCode.childElementCount
            var offset = 0
            var debugElementTop = 3
            var currentLineNeedShow = false
            var currentIconNeedShow = false
            const currentLineElement = document.getElementById('debug-current-line')
            if (currentLineElement) {
                currentLineElement.style.display = 'none'
            }
            for (let i = 0; i < codeChildCount; i++) {
                const codeLine = eContentCode.children.item(i)
                if (!codeLine) return

                if (!codeLine.classList.contains('c-code')) {
                    offset--
                    continue
                }

                debugElementTop += codeLine.clientHeight
                
                codeLine.classList.remove('current')

                if (Interpeter.CodePointer === i + offset) {
                    currentLineNeedShow = true
                    currentIconNeedShow = true
                }

                if (currentIconNeedShow && CompiledCode[i + offset].Opcode !== 'COMMENT') {
                    currentIconNeedShow = false
                    codeLine.classList.add('current')
                }
                if (currentLineNeedShow && CompiledCode[i + offset].Opcode !== 'COMMENT') {
                    currentLineNeedShow = false
                    if (currentLineElement) {
                        currentLineElement.style.top = debugElementTop + 'px'
                        currentLineElement.style.height = codeLine.clientHeight + 'px'
                        currentLineElement.style.display = 'block'
                    }
                }
            }

            /** @type {HTMLTableElement | null} */
            /*
            const heapContent = document.querySelector('#heap-content table')
            if (heapContent) {
                heapContent.innerHTML = ''
    
                const headerRow0 = document.createElement('tr')
                headerRow0.appendChild(document.createElement('th'))
                headerRow0.appendChild(document.createElement('th'))
                heapContent.appendChild(headerRow0)
    
                for (let i = 0; i < Interpeter.Heap.length; i++) {
                    const item = Interpeter.Heap[i]
                    const newRow = document.createElement('tr')
                    newRow.id = 'heap-row-i-' + i
    
                    const cell0 = document.createElement('td')
                    const cell1 = document.createElement('td')
    
                    if (Interpeter.BasePointer === i) {
                        const newI = document.createElement('i')
                        newI.className = 'fa-sharp fa-solid fa-caret-right st-base-pointer st-base-pointer-active'
                        newI.title = 'Base Pointer'
                        cell0.appendChild(newI)
                        basePointerShown = true
                    }
    
                    cell0.appendChild(CreateSpan(i.toString(), ''))
    
                    if (item.Type === 'INT' || item.Type === 'FLOAT') {
                        cell1.appendChild(CreateSpan(item.Value, 'st-num'))
                    } else if (item.Type === 'STRING') {
                        cell1.appendChild(CreateSpan('"' + item.Value + '"', 'st-str'))
                    } else if (item.Type === 'BOOLEAN') {
                        cell1.appendChild(CreateSpan(item.Value, 'st-bool'))
                    } else if (item.Type === 'STRUCT') {
                        cell1.appendChild(CreateSpan('{ ... }', ''))
                    } else if (item.Type === 'LIST') {
                        cell1.appendChild(CreateSpan('[ ... ]', ''))
                    } else {
                        cell1.appendChild(CreateSpan(item.Value, 'st-param'))
                    }
    
                    if (item.Tag !== null) {
                        if (item.Tag === 'return value' && i < Interpeter.BasePointer) {
                            const newI = document.createElement('i')
                            newI.className = 'fa-solid fa-share st-return-value'
                            newI.title = 'Return Value'
                            newI.style.transform = 'rotate(-90deg)'
                            cell1.appendChild(newI)
                            lastReturnValueIcon = newI
                        } else if (item.Tag === 'saved base pointer') {
                            const newI = document.createElement('i')
                            newI.className = 'fa-sharp fa-solid fa-caret-right st-base-pointer'
                            newI.title = 'Saved Base Pointer'
                            try {
                                heapContent.querySelectorAll('tr')[Number.parseInt(item.Value) + 1].querySelector('td').appendChild(newI)
                            } catch (err) { }
                            cell1.appendChild(CreateSpan(item.Tag, 'st-tag'))
                        } else if (item.Tag.startsWith('var.')) {
                            const varName = item.Tag.substring(4)
                            const newElement = document.createElement('span')
                            const newIcon = GenerateCustomIcon('../../gui/var.png', '#f00', 16, 16)
                            newIcon.style.display = 'inline-block'
                            newElement.appendChild(newIcon)
                            newElement.appendChild(CreateSpan(varName, ''))
                            newElement.className = 'heap-label-var'
                            newElement.title = 'Variable'
                            cell1.appendChild(newElement)
                        } else if (item.Tag.startsWith('param.') && i < Interpeter.BasePointer) {
                            const varName = item.Tag.substring(6)
                            const newElement = document.createElement('span')
                            const newIcon = GenerateCustomIcon('../../gui/var.png', '#f00', 16, 16)
                            newIcon.style.display = 'inline-block'
                            newElement.appendChild(newIcon)
                            newElement.appendChild(CreateSpan(varName, ''))
                            newElement.className = 'heap-label-var'
                            newElement.title = 'Parameter'
                            cell1.appendChild(newElement)
                        } else {
                            cell1.appendChild(CreateSpan(item.Tag, 'st-tag'))
                        }
                    }
    
                    newRow.appendChild(cell0)
                    newRow.appendChild(cell1)
    
                    if (document.getElementsByClassName('heap-higlighted-index-' + i).length > 0) {
                        newRow.classList.add('heap-item-higlighted')
                    }
    
                    heapContent.appendChild(newRow)
                }
            }
            */

            /** @type {HTMLTableElement | null} */
            /*
            const stackContent = document.querySelector('#stack-content table')
            if (stackContent) {
                stackContent.innerHTML = ''
    
                const headerRow1 = document.createElement('tr')
                headerRow1.appendChild(document.createElement('th'))
                headerRow1.appendChild(document.createElement('th'))
                stackContent.appendChild(headerRow1)
    
                var lastReturnValueIcon = null
    
                var basePointerShown = false
                for (let i = 0; i < Interpeter.Stack.length; i++) {
                    const item = Interpeter.Stack[i]
                    const newRow = document.createElement('tr')
                    newRow.id = 'stack-row-i-' + i
    
                    const cell0 = document.createElement('td')
                    const cell1 = document.createElement('td')
    
                    if (Interpeter.BasePointer === i) {
                        const newI = document.createElement('i')
                        newI.className = 'fa-sharp fa-solid fa-caret-right st-base-pointer st-base-pointer-active'
                        newI.title = 'Base Pointer'
                        cell0.appendChild(newI)
                        basePointerShown = true
                    }
    
                    cell0.appendChild(CreateSpan(i.toString(), ''))
    
                    if (item.Type === 'INT' || item.Type === 'FLOAT') {
                        cell1.appendChild(CreateSpan(item.Value, 'st-num'))
                    } else if (item.Type === 'STRING') {
                        cell1.appendChild(CreateSpan('"' + item.Value + '"', 'st-str'))
                    } else if (item.Type === 'BOOLEAN') {
                        cell1.appendChild(CreateSpan(item.Value, 'st-bool'))
                    } else if (item.Type === 'STRUCT') {
                        cell1.appendChild(CreateSpan('{ ... }', ''))
                    } else if (item.Type === 'LIST') {
                        cell1.appendChild(CreateSpan('[ ... ]', ''))
                    } else {
                        cell1.appendChild(CreateSpan(item.Value, 'st-param'))
                    }
    
                    if (item.Tag !== null) {
                        if (item.Tag === 'return value' && i < Interpeter.BasePointer) {
                            const newI = document.createElement('i')
                            newI.className = 'fa-solid fa-share st-return-value'
                            newI.title = 'Return Value'
                            newI.style.transform = 'rotate(-90deg)'
                            cell1.appendChild(newI)
                            lastReturnValueIcon = newI
                        } else if (item.Tag === 'saved base pointer') {
                            const newI = document.createElement('i')
                            newI.className = 'fa-sharp fa-solid fa-caret-right st-base-pointer'
                            newI.title = 'Saved Base Pointer'
                            try {
                                stackContent.querySelectorAll('tr')[Number.parseInt(item.Value) + 1].querySelector('td').appendChild(newI)
                            } catch (err) { }
                            cell1.appendChild(CreateSpan(item.Tag, 'st-tag'))
                        } else if (item.Tag.startsWith('var.')) {
                            const varName = item.Tag.substring(4)
                            const newElement = document.createElement('span')
                            const newIcon = GenerateCustomIcon('../../gui/var.png', '#f00', 16, 16)
                            newIcon.style.display = 'inline-block'
                            newElement.appendChild(newIcon)
                            newElement.appendChild(CreateSpan(varName, ''))
                            newElement.className = 'stack-label-var'
                            newElement.title = 'Variable'
                            cell1.appendChild(newElement)
                        } else if (item.Tag.startsWith('param.') && i < Interpeter.BasePointer) {
                            const varName = item.Tag.substring(6)
                            const newElement = document.createElement('span')
                            const newIcon = GenerateCustomIcon('../../gui/var.png', '#f00', 16, 16)
                            newIcon.style.display = 'inline-block'
                            newElement.appendChild(newIcon)
                            newElement.appendChild(CreateSpan(varName, ''))
                            newElement.className = 'stack-label-var'
                            newElement.title = 'Parameter'
                            cell1.appendChild(newElement)
                        } else {
                            cell1.appendChild(CreateSpan(item.Tag, 'st-tag'))
                        }
                    }
    
                    newRow.appendChild(cell0)
                    newRow.appendChild(cell1)
    
                    if (document.getElementsByClassName('stack-higlighted-index-' + i).length > 0) {
                        newRow.classList.add('stack-item-higlighted')
                    }
    
                    stackContent.appendChild(newRow)
                }
            }
            */

            /*
            if (lastReturnValueIcon) {
                lastReturnValueIcon.classList.add('st-return-value-active')
            }
            */

            /*
            if (!basePointerShown && Interpeter.BasePointer === Interpeter.Stack.length) {
                const newRow = document.createElement('tr')

                const cell0 = document.createElement('td')
                const cell1 = document.createElement('td')

                const newI = document.createElement('i')
                newI.className = 'fa-sharp fa-solid fa-caret-right st-base-pointer st-base-pointer-active'
                newI.title = 'Base Pointer'
                cell0.appendChild(newI)
                basePointerShown = true

                newRow.appendChild(cell0)
                newRow.appendChild(cell1)

                stackContent.appendChild(newRow)
            }
            */
        },
        'intp2-data': Interpeter => {

        }
    }
}

/**
 * @param {string | number | boolean} content
 * @param {string} className
 */
function CreateSpan(content, className) {
    const eNew = document.createElement('span')
    if (content) { eNew.textContent = content.toString() }
    eNew.className = className
    return eNew
}

/**
 * @param {string} name
 */
function CreateCodicon(name) {
    const eNew = document.createElement('i')
    eNew.className = `codicon codicon-${name}`
    return eNew
}

Main()
