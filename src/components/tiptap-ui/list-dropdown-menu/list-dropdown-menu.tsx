import * as React from "react"
import { type Editor } from "@tiptap/react"

// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor"

// --- Icons ---
import { ChevronDownIcon } from "@/components/tiptap-icons/chevron-down-icon"

// --- Tiptap UI ---
import { ListButton, type ListType } from "@/components/tiptap-ui/list-button"

import { useListDropdownMenu } from "./use-list-dropdown-menu"

// --- UI Primitives ---
import type { ButtonProps } from "@/components/tiptap-ui-primitive/button"
import { Button, ButtonGroup } from "@/components/tiptap-ui-primitive/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/tiptap-ui-primitive/dropdown-menu"
import { Card, CardBody } from "@/components/tiptap-ui-primitive/card"

export interface ListDropdownMenuProps extends Omit<ButtonProps, "type"> {
  /**
   * La instancia del editor de Tiptap.
   */
  editor?: Editor
  /**
   * Los tipos de lista para mostrar en el menú desplegable.
   */
  types?: ListType[]
  /**
   * Si el menú desplegable debe estar oculto cuando no hay tipos de lista disponibles
   * @default false
   */
  hideWhenUnavailable?: boolean
  /**
   * Callback para cuando el menú desplegable se abre o cierra
   */
  onOpenChange?: (isOpen: boolean) => void
  /**
   * Si el menú desplegable debe renderizarse en un portal
   * @default false
   */
  portal?: boolean
}

export function ListDropdownMenu({
  editor: providedEditor,
  types = ["bulletList", "orderedList", "taskList"],
  hideWhenUnavailable = false,
  onOpenChange,
  portal = false,
  ...props
}: ListDropdownMenuProps) {
  const { editor } = useTiptapEditor(providedEditor)
  const [isOpen, setIsOpen] = React.useState(false)

  const { filteredLists, canToggle, isActive, isVisible, Icon } =
    useListDropdownMenu({
      editor,
      types,
      hideWhenUnavailable,
    })

  const handleOnOpenChange = React.useCallback(
    (open: boolean) => {
      setIsOpen(open)
      onOpenChange?.(open)
    },
    [onOpenChange]
  )

  if (!isVisible || !editor || !editor.isEditable) {
    return null
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOnOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          data-style="ghost"
          data-active-state={isActive ? "on" : "off"}
          role="button"
          tabIndex={-1}
          disabled={!canToggle}
          data-disabled={!canToggle}
          aria-label="Opciones de lista"
          tooltip="Lista"
          {...props}
        >
          <Icon className="tiptap-button-icon" />
          <ChevronDownIcon className="tiptap-button-dropdown-small" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" portal={portal}>
        <Card>
          <CardBody>
            <ButtonGroup>
              {filteredLists.map((option) => (
                <DropdownMenuItem key={option.type} asChild>
                  <ListButton
                    editor={editor}
                    type={option.type}
                    text={option.label}
                    showTooltip={false}
                  />
                </DropdownMenuItem>
              ))}
            </ButtonGroup>
          </CardBody>
        </Card>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default ListDropdownMenu
