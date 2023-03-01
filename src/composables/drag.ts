/*
  DRAGGIFY
  drag and drop composable

  rules - an element can only be dragged
  from a drag zone

  and can only be dropped in a drop zone
  if a drop zone is not specified
  the item can be dropped in either
  of the provided lists
*/

import { onMounted, onUnmounted, type Ref, ref } from 'vue'

interface Preview {
  list: number
  target: number
}

interface IDType {
  id: number | string
}

export function useDragDrop<T extends IDType>(items: Array<T[]>): { lists: Ref<Array<T[]>> } {
  // can either pass a list of refs or classes, for both drop zones and
  // lists

  // if no drop zones are provided we can assume all of the lists
  // can accept items, treat them all as dropzones

  const lists = ref(items) as Ref<Array<T[]>>
  let startingLists = JSON.parse(JSON.stringify(items)) // starting value before dragging

  let elem: HTMLElement | null = null // the real element that's currently being tracked
  let dragging: HTMLElement | null | undefined = null // the copied element being dragged

  let startX = 0 // The x-coordinate where the drag started
  let startY = 0 // The y-coordinate where the drag started
  /*
    INDECES TO KEEP TRACK OF
    Original Index -> element that is being dragged
    Original List Index -> the index of the list that hosted the starting element
    Target Index -> index of the destination
    Target List Index -> index of the list of destination
  */
  let originalIndex = -1
  let originalListIndex = -1
  let targetListIndex = -1
  let targetIndex = -1

  let originalItem: T | null = null // this is the original item being dragged
  let addedPreview: Preview | null = null // indeces of the preview

  onUnmounted(() => {
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
  })

  onMounted(() => {
    window.addEventListener('mousedown', function (e) {
      e.preventDefault()

      if (e.target instanceof HTMLElement) {
        elem = e.target?.closest('.draggify') as HTMLElement

        if (!elem) return

        dragging = elem?.cloneNode(true) as HTMLElement

        if (!dragging) {
          return
        }

        // find index of the dragged item
        // relative to the lists
        for (const [i, list] of Object.entries(lists.value)) {
          originalIndex = list.findIndex((f) => f.id.toString() === elem?.getAttribute('id'))

          // if something is found break the loop
          if (originalIndex !== -1) {
            originalListIndex = Number(i)
            break
          }
        }

        if (!originalItem) {
          originalItem = JSON.parse(JSON.stringify(lists.value[originalListIndex][originalIndex]))

          lists.value[originalListIndex].splice(originalIndex, 1)
        }

        // style the element to be spooky 👻 while dragging
        dragging.style.position = 'absolute'
        dragging.style.zIndex = '1000'
        dragging.style.opacity = '1'
        dragging.style.pointerEvents = 'none'
        document.body.appendChild(dragging)

        startX = e.pageX
        startY = e.pageY
        dragging.style.left = startX - dragging.clientWidth / 2 + 'px'
        dragging.style.top = startY - dragging.clientHeight / 2 + 'px'

        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mouseup', handleMouseUp)
      }
    })
  })

  function handleMouseMove(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!dragging) return

    const dx = e.pageX - startX
    const dy = e.pageY - startY

    dragging.style.left = startX + dx - dragging.clientWidth / 2 + 'px'
    dragging.style.top = startY + dy - dragging.clientHeight / 2 + 'px'

    // find out which item we're hovering on
    // since the dragging element has pointer events set to none
    // it won't affect our check
    const target = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest('.draggify') as HTMLElement

    if (!target) {
      targetIndex = -1
      return
    }

    // get the target element and assign target indeces
    for (const [i, list] of Object.entries(lists.value)) {
      if (!target.getAttribute('id')) {
        break
      }

      const found = list.find((f) => f.id.toString() === target.getAttribute('id'))

      if (!found) {
        continue
      }

      targetIndex = list.findIndex((f) => f.id.toString() === target.getAttribute('id'))

      targetListIndex = Number(i)

      break
    }

    // if a preview has been added remove it on the next
    // occurrence
    if (addedPreview) {
      lists.value[addedPreview.list].splice(addedPreview.target, 1)
    }

    // add the dragged item to the target list
    if (originalItem) {
      lists.value[targetListIndex].splice(targetIndex, 0, originalItem)
    }

    // keep track of the preview item
    addedPreview = { list: targetListIndex, target: targetIndex }
  }

  function handleMouseUp(e: MouseEvent) {
    e.preventDefault()
    if (!dragging || !elem) return

    elem.style.opacity = '1'

    document.body.removeChild(dragging)
    dragging = null

    if (targetIndex === -1) {
      // ❌ UNSUCCESSFUL DRAG ❌
      // restore the list to starting value
      lists.value = JSON.parse(JSON.stringify(startingLists))
    } else {
      // ✅ SUCCESFULL DRAG ✅
      // the preview has already added the item to
      // the list
      // if successful then overwrite the starting list
      startingLists = JSON.parse(JSON.stringify(lists.value))
    }

    cleanUp()

    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
  }

  function cleanUp() {
    originalIndex = -1
    originalListIndex = -1
    addedPreview = null
    targetListIndex = -1
    targetIndex = -1
    originalItem = null
  }

  return {
    lists: lists
  }
}
