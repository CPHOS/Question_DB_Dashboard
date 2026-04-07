import { Badge } from "@chakra-ui/react"

export default function StatusBadge({ value }: { value: string }) {
    if (value === "reviewed") return <Badge colorPalette="purple">已审</Badge>
    if (value === "used") return <Badge colorPalette="orange">已用</Badge>
    return <Badge variant="outline">无</Badge>
}
