import { Box, FileUpload, Icon } from "@chakra-ui/react"
import { LuUpload } from "react-icons/lu"

interface Props {
    accept?: string[]
    label?: string
    description?: string
    onFileChange: (file: File | null) => void
    required?: boolean
}

export default function FileDropzone({
    accept = [".zip"],
    label = "拖放文件到此处",
    description = "或点击选择文件",
    onFileChange,
}: Props) {
    return (
        <FileUpload.Root
            maxFiles={1}
            accept={accept}
            w="full"
            onFileAccept={(details) => {
                onFileChange(details.files[0] ?? null)
            }}
        >
            <FileUpload.HiddenInput />
            <FileUpload.Dropzone w="full">
                <Icon size="lg" color="fg.muted">
                    <LuUpload />
                </Icon>
                <FileUpload.DropzoneContent>
                    <Box>{label}</Box>
                    <Box color="fg.muted" fontSize="sm">{description}</Box>
                </FileUpload.DropzoneContent>
            </FileUpload.Dropzone>
            <FileUpload.List showSize clearable />
        </FileUpload.Root>
    )
}
