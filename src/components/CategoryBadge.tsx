import { Badge } from "@chakra-ui/react"

/** Short form: T / E / — */
export default function CategoryBadge({ value }: { value: string }) {
    if (value === "T") return <Badge colorPalette="blue">T</Badge>
    if (value === "E") return <Badge colorPalette="green">E</Badge>
    return <Badge variant="outline">—</Badge>
}

/** Long form: 理论 / 实验 / 未分类 */
export function CategoryBadgeLabel({ value }: { value: string }) {
    if (value === "T") return <Badge colorPalette="blue">理论</Badge>
    if (value === "E") return <Badge colorPalette="green">实验</Badge>
    return <Badge variant="outline">未分类</Badge>
}
