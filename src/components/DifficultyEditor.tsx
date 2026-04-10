import { useState, type KeyboardEvent } from "react"
import {
    Box,
    Button,
    HStack,
    Input,
    Stack,
    Textarea,
    Field,
    IconButton,
    Text,
    Badge,
} from "@chakra-ui/react"
import { LuPlus, LuX } from "react-icons/lu"
import type { Difficulty } from "@/types"

interface Props {
    value: Difficulty
    onChange: (value: Difficulty) => void
}

export default function DifficultyEditor({ value, onChange }: Props) {
    const [newTag, setNewTag] = useState("")

    const tags = Object.keys(value)

    const updateEntry = (tag: string, field: "score" | "notes", v: string) => {
        const entry = value[tag] ?? { score: 5 }
        if (field === "score") {
            onChange({ ...value, [tag]: { ...entry, score: parseInt(v) || 1 } })
        } else {
            onChange({ ...value, [tag]: { ...entry, notes: v || null } })
        }
    }

    const removeTag = (tag: string) => {
        if (tag === "human") return
        const next = { ...value }
        delete next[tag]
        onChange(next)
    }

    const addTag = () => {
        const t = newTag.trim()
        if (!t || t in value) return
        onChange({ ...value, [t]: { score: 5, notes: null } })
        setNewTag("")
    }

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault()
            addTag()
        }
    }

    return (
        <Stack gap="3">
            {tags.map((tag) => (
                <Box
                    key={tag}
                    borderWidth="1px"
                    borderRadius="md"
                    p="3"
                >
                    <HStack mb="2" justify="space-between">
                        <HStack gap="2" align="center">
                            <Text fontWeight="medium" fontSize="sm">
                                {tag === "human" ? "人工难度 (human)" : tag}
                            </Text>
                            {value[tag]?.updated_by && (
                                <Badge size="sm" colorPalette="purple" variant="subtle">
                                    {value[tag].updated_by!.display_name || value[tag].updated_by!.username} (@{value[tag].updated_by!.username})
                                </Badge>
                            )}
                        </HStack>
                        {tag !== "human" && (
                            <IconButton
                                aria-label="删除"
                                size="2xs"
                                variant="ghost"
                                colorPalette="red"
                                onClick={() => removeTag(tag)}
                            >
                                <LuX />
                            </IconButton>
                        )}
                    </HStack>
                    <HStack gap="4">
                        <Field.Root required flex="0 0 auto" w="120px">
                            <Field.Label>分值 (1-10)</Field.Label>
                            <Input
                                type="number"
                                min={1}
                                max={10}
                                size="sm"
                                value={String(value[tag]?.score ?? 5)}
                                onChange={(e) => updateEntry(tag, "score", e.target.value)}
                            />
                        </Field.Root>
                        <Field.Root flex="1">
                            <Field.Label>备注</Field.Label>
                            <Textarea
                                size="sm"
                                value={value[tag]?.notes ?? ""}
                                onChange={(e) => updateEntry(tag, "notes", e.target.value)}
                                placeholder="可选备注"
                                rows={1}
                            />
                        </Field.Root>
                    </HStack>
                </Box>
            ))}

            <HStack gap="2">
                <Input
                    size="sm"
                    placeholder="新难度标签名（如 algorithm）"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <Button size="sm" variant="outline" onClick={addTag} disabled={!newTag.trim()}>
                    <LuPlus /> 添加
                </Button>
            </HStack>
        </Stack>
    )
}
