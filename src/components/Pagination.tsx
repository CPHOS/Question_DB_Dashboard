import { HStack, IconButton, Text, Select, Portal, createListCollection } from "@chakra-ui/react"
import { LuChevronLeft, LuChevronRight } from "react-icons/lu"

const PAGE_SIZE_OPTIONS = createListCollection({
    items: [
        { label: "10 条/页", value: "10" },
        { label: "20 条/页", value: "20" },
        { label: "50 条/页", value: "50" },
        { label: "100 条/页", value: "100" },
    ],
})

interface Props {
    page: number
    totalPages: number
    total?: number
    pageSize?: number
    onPrev: () => void
    onNext: () => void
    onPageSizeChange?: (size: number) => void
}

export default function Pagination({ page, totalPages, total, pageSize, onPrev, onNext, onPageSizeChange }: Props) {
    return (
        <HStack justify={total != null ? "space-between" : "end"} mt="2">
            {total != null && (
                <Text fontSize="sm" color="fg.muted">共 {total} 条</Text>
            )}
            <HStack>
                <IconButton aria-label="prev" size="xs" variant="outline" disabled={page === 0} onClick={onPrev}>
                    <LuChevronLeft />
                </IconButton>
                <Text fontSize="sm">{page + 1} / {totalPages || 1}</Text>
                <IconButton aria-label="next" size="xs" variant="outline" disabled={page + 1 >= totalPages} onClick={onNext}>
                    <LuChevronRight />
                </IconButton>

                {onPageSizeChange && pageSize != null && (
                    <Select.Root
                        collection={PAGE_SIZE_OPTIONS}
                        size="xs"
                        width="120px"
                        value={[String(pageSize)]}
                        onValueChange={(e) => onPageSizeChange(Number(e.value[0]) || 20)}
                    >
                        <Select.HiddenSelect />
                        <Select.Control>
                            <Select.Trigger><Select.ValueText /></Select.Trigger>
                            <Select.IndicatorGroup><Select.Indicator /></Select.IndicatorGroup>
                        </Select.Control>
                        <Portal>
                            <Select.Positioner>
                                <Select.Content>
                                    {PAGE_SIZE_OPTIONS.items.map((item) => (
                                        <Select.Item item={item} key={item.value}>
                                            {item.label}<Select.ItemIndicator />
                                        </Select.Item>
                                    ))}
                                </Select.Content>
                            </Select.Positioner>
                        </Portal>
                    </Select.Root>
                )}
            </HStack>
        </HStack>
    )
}
