import { Upload } from 'lucide-react'
import { useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { uploadImage } from '@/services/admin'
import { getApiErrorMessage } from '@/utils/errors'

const MAX_SIZE_MB = 5
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

export function ImageUploadButton({
  onUploaded,
  multiple = false,
  label = 'Tải ảnh lên',
  disabled = false,
}: {
  onUploaded: (urls: string[]) => void | Promise<void>
  multiple?: boolean
  label?: string
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(null)

    const list = Array.from(files)
    const invalid = list.find((f) => !ACCEPTED.includes(f.type) || f.size > MAX_SIZE_MB * 1024 * 1024)
    if (invalid) {
      setError(`"${invalid.name}" không hợp lệ: chỉ nhận ảnh JPG, PNG, WebP tối đa ${MAX_SIZE_MB}MB`)
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    setUploading(true)
    try {
      const urls: string[] = []
      for (const file of list) urls.push(await uploadImage(file))
      await onUploaded(urls)
    } catch (err) {
      setError(getApiErrorMessage(err) ?? 'Không thể tải ảnh lên')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        multiple={multiple}
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
      >
        <Upload /> {uploading ? 'Đang tải lên…' : label}
      </Button>
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  )
}
