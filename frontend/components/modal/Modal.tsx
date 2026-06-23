"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { useMediaQuery } from "@/hooks/use-media-query";
import { useModal } from "@/hooks/useModal";

export default function Modal() {
  const { isOpen, modalContent, closeModal } = useModal();
  const isDesktop = useMediaQuery("(min-width: 768px)")

  if (isDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={closeModal} >
        <DialogContent className="sm:max-w-[425px] rounded-2xl border-none">
          <DialogHeader>
            <DialogTitle className="sr-only">Title</DialogTitle>
          </DialogHeader>
          {modalContent}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer repositionInputs={false} open={isOpen} onOpenChange={closeModal}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle className="sr-only">Title</DrawerTitle>
        </DrawerHeader>
        {modalContent}
      </DrawerContent>
    </Drawer>
  );
}
