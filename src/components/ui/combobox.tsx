
import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ComboboxProps {
  options: { value: string; label: string }[]
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
  allowCustom?: boolean
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Selecione uma opção...",
  searchPlaceholder = "Pesquisar...",
  emptyText = "Nenhuma opção encontrada.",
  className,
  disabled = false,
  allowCustom = true,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")

  const selectedOption = options.find(option => option.value === value)
  const displayValue = selectedOption ? selectedOption.label : (value || "")

  // Filtrar opções baseado no input
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(inputValue.toLowerCase())
  )

  const handleSelect = (currentValue: string) => {
    if (currentValue === value) {
      onValueChange("")
    } else {
      onValueChange(currentValue)
    }
    setOpen(false)
    setInputValue("")
  }

  const handleCustomValue = () => {
    if (allowCustom && inputValue.trim() && !filteredOptions.some(opt => opt.label.toLowerCase() === inputValue.toLowerCase())) {
      onValueChange(inputValue.trim())
      setOpen(false)
      setInputValue("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && allowCustom && inputValue.trim()) {
      e.preventDefault()
      handleCustomValue()
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          <span className="truncate">{displayValue || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-white border border-gray-200 shadow-lg z-50" align="start">
        <Command className="bg-white">
          <CommandInput 
            placeholder={searchPlaceholder}
            value={inputValue}
            onValueChange={setInputValue}
            onKeyDown={handleKeyDown}
          />
          <CommandList>
            <CommandEmpty>
              <div className="py-2">
                <p className="text-sm text-gray-500">{emptyText}</p>
                {allowCustom && inputValue.trim() && (
                  <button
                    onClick={handleCustomValue}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Criar "{inputValue.trim()}"
                  </button>
                )}
              </div>
            </CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => handleSelect(option.value)}
                  className="hover:bg-gray-100 cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
