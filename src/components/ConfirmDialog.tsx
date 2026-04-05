import { Dialog, Button, Portal } from "@chakra-ui/react"

interface Props {
    open: boolean
    title: string
    description: string
    confirmLabel?: string
    cancelLabel?: string
    onConfirm: () => void
    onCancel: () => void
}

export default function ConfirmDialog({
    open,
    title,
    description,
    confirmLabel = "确定",
    cancelLabel = "取消",
    onConfirm,
    onCancel,
}: Props) {
    return (
        <Dialog.Root open={open} onOpenChange={(d) => { if (!d.open) onCancel() }} placement="center">
            <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content>
                        <Dialog.Header>
                            <Dialog.Title>{title}</Dialog.Title>
                        </Dialog.Header>
                        <Dialog.Body>{description}</Dialog.Body>
                        <Dialog.Footer>
                            <Button variant="outline" onClick={onCancel}>
                                {cancelLabel}
                            </Button>
                            <Button colorPalette="red" onClick={onConfirm}>
                                {confirmLabel}
                            </Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    )
}
