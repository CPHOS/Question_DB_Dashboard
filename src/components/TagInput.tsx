import { useState, type KeyboardEvent } from "react"
import { HStack, Input, Badge, IconButton, Flex } from "@chakra-ui/react"
import { LuX, LuPlus } from "react-icons/lu"

interface Props {
    value: string[]
    onChange: (value: string[]) => void
    placeholder?: string
}

export default function TagInput({ value, onChange, placeholder = "输入后按回车添加" }: Props) {
    const [input, setInput] = useState("")

    const addItem = () => {
        const trimmed = input.trim()
        if (trimmed && !value.includes(trimmed)) {
            onChange([...value, trimmed])
        }
        setInput("")
    }

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault()
            addItem()
        }
    }

    const remove = (item: string) => {
        onChange(value.filter((v) => v !== item))
    }

    return (
        <Flex direction="column" gap="2">
            <HStack>
                <Input
                    size="sm"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                />
                <IconButton
                    aria-label="add"
                    size="sm"
                    variant="outline"
                    onClick={addItem}
                    disabled={!input.trim()}
                >
                    <LuPlus />
                </IconButton>
            </HStack>
            {value.length > 0 && (
                <HStack wrap="wrap" gap="1">
                    {value.map((item) => (
                        <Badge key={item} variant="subtle" size="sm" gap="1">
                            {item}
                            <IconButton
                                aria-label="remove"
                                size="2xs"
                                variant="ghost"
                                onClick={() => remove(item)}
                                minW="4"
                                h="4"
                            >
                                <LuX />
                            </IconButton>
                        </Badge>
                    ))}
                </HStack>
            )}
        </Flex>
    )
}
