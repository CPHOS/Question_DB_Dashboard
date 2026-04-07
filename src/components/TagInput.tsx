import { useState, useRef, useEffect, type KeyboardEvent } from "react"
import { HStack, Input, Badge, IconButton, Flex, Box, Text } from "@chakra-ui/react"
import { LuX, LuPlus } from "react-icons/lu"

interface Props {
    value: string[]
    onChange: (value: string[]) => void
    placeholder?: string
    suggestions?: string[]
}

export default function TagInput({ value, onChange, placeholder = "输入后按回车添加", suggestions }: Props) {
    const [input, setInput] = useState("")
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [highlightIndex, setHighlightIndex] = useState(-1)
    const containerRef = useRef<HTMLDivElement>(null)

    const filtered = suggestions
        ? suggestions.filter(
              (s) =>
                  s.toLowerCase().includes(input.toLowerCase()) &&
                  !value.includes(s) &&
                  input.trim() !== ""
          )
        : []

    const addItem = (item?: string) => {
        const trimmed = (item ?? input).trim()
        if (trimmed && !value.includes(trimmed)) {
            onChange([...value, trimmed])
        }
        setInput("")
        setShowSuggestions(false)
        setHighlightIndex(-1)
    }

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (showSuggestions && filtered.length > 0) {
            if (e.key === "ArrowDown") {
                e.preventDefault()
                setHighlightIndex((i) => (i + 1) % filtered.length)
                return
            }
            if (e.key === "ArrowUp") {
                e.preventDefault()
                setHighlightIndex((i) => (i <= 0 ? filtered.length - 1 : i - 1))
                return
            }
            if (e.key === "Enter" && highlightIndex >= 0) {
                e.preventDefault()
                addItem(filtered[highlightIndex])
                return
            }
        }
        if (e.key === "Enter") {
            e.preventDefault()
            addItem()
        }
        if (e.key === "Escape") {
            setShowSuggestions(false)
        }
    }

    const remove = (item: string) => {
        onChange(value.filter((v) => v !== item))
    }

    // Close suggestions on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowSuggestions(false)
            }
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [])

    return (
        <Flex direction="column" gap="2" ref={containerRef}>
            <HStack position="relative">
                <Box flex="1" position="relative">
                    <Input
                        size="sm"
                        value={input}
                        onChange={(e) => {
                            setInput(e.target.value)
                            setShowSuggestions(true)
                            setHighlightIndex(-1)
                        }}
                        onFocus={() => input.trim() && setShowSuggestions(true)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        autoComplete="off"
                    />
                    {showSuggestions && filtered.length > 0 && (
                        <Box
                            position="absolute"
                            top="100%"
                            left="0"
                            right="0"
                            mt="1"
                            bg="bg"
                            borderWidth="1px"
                            borderColor="border"
                            borderRadius="md"
                            boxShadow="md"
                            zIndex="popover"
                            maxH="200px"
                            overflowY="auto"
                        >
                            {filtered.map((s, i) => (
                                <Box
                                    key={s}
                                    px="3"
                                    py="1.5"
                                    cursor="pointer"
                                    bg={i === highlightIndex ? "bg.emphasized" : undefined}
                                    _hover={{ bg: "bg.emphasized" }}
                                    onMouseDown={(e) => {
                                        e.preventDefault()
                                        addItem(s)
                                    }}
                                    onMouseEnter={() => setHighlightIndex(i)}
                                >
                                    <Text fontSize="sm">{s}</Text>
                                </Box>
                            ))}
                        </Box>
                    )}
                </Box>
                <IconButton
                    aria-label="add"
                    size="sm"
                    variant="outline"
                    onClick={() => addItem()}
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
