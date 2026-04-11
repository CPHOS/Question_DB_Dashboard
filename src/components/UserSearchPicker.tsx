import { useState, useRef, useEffect, useCallback } from "react"
import {
    Box,
    Input,
    Text,
    HStack,
    Spinner,
    VStack,
} from "@chakra-ui/react"
import type { User } from "@/types"
import * as api from "@/lib/api"

interface Props {
    /** Placeholder text for the search input */
    placeholder?: string
    /** User IDs to exclude from results (already added reviewers, etc.) */
    excludeIds?: string[]
    /** Only show users with these roles (default: all except bot) */
    filterRoles?: string[]
    /** Called when a user is selected */
    onSelect: (user: User) => void
    /** Disable the input */
    disabled?: boolean
}

export default function UserSearchPicker({
    placeholder = "搜索用户名或显示名…",
    excludeIds = [],
    filterRoles,
    onSelect,
    disabled,
}: Props) {
    const [query, setQuery] = useState("")
    const [results, setResults] = useState<User[]>([])
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

    const search = useCallback(
        async (q: string) => {
            if (!q.trim()) {
                setResults([])
                setOpen(false)
                return
            }
            setLoading(true)
            try {
                const res = await api.searchUsers(q.trim(), 10)
                const filtered = res.items.filter(
                    (u) => !excludeIds.includes(u.user_id) &&
                        (filterRoles ? filterRoles.includes(u.role) : u.role !== "bot")
                )
                setResults(filtered)
                setOpen(filtered.length > 0)
            } catch {
                setResults([])
                setOpen(false)
            } finally {
                setLoading(false)
            }
        },
        [excludeIds]
    )

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => search(query), 300)
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [query, search])

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [])

    const handleSelect = (user: User) => {
        onSelect(user)
        setQuery("")
        setResults([])
        setOpen(false)
    }

    return (
        <Box position="relative" ref={containerRef} flex="1">
            <HStack>
                <Input
                    placeholder={placeholder}
                    size="sm"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => results.length > 0 && setOpen(true)}
                    disabled={disabled}
                />
                {loading && <Spinner size="sm" />}
            </HStack>
            {open && (
                <Box
                    position="absolute"
                    top="100%"
                    left="0"
                    right="0"
                    zIndex="dropdown"
                    bg="bg"
                    borderWidth="1px"
                    borderRadius="md"
                    shadow="md"
                    mt="1"
                    maxH="200px"
                    overflowY="auto"
                >
                    <VStack align="stretch" gap="0">
                        {results.map((u) => (
                            <Box
                                key={u.user_id}
                                px="3"
                                py="2"
                                cursor="pointer"
                                _hover={{ bg: "bg.emphasized" }}
                                onClick={() => handleSelect(u)}
                            >
                                <Text fontSize="sm" fontWeight="medium">
                                    {u.display_name || u.username}
                                </Text>
                                <Text fontSize="xs" color="fg.muted">
                                    @{u.username}
                                </Text>
                            </Box>
                        ))}
                    </VStack>
                </Box>
            )}
        </Box>
    )
}
