Build a compound **Accordion**: `<Accordion>` owns the state, `<AccordionItem>`s read it through context.

```tsx
<Accordion allowMultiple defaultValue={['shipping']}>
  <AccordionItem value="shipping" title="Shipping">We ship worldwide.</AccordionItem>
  <AccordionItem value="returns" title="Returns">30-day returns.</AccordionItem>
</Accordion>
```

**Requirements**

1. Each item renders `<h3><button aria-expanded aria-controls>{title}</button></h3>` and a panel with `role="region"` and `aria-labelledby` → its button (so the region is named by the header). Generate ids with `useId`.
2. A collapsed panel isn't visible (the `hidden` attribute or not rendering it — your choice).
3. **Default mode:** at most one item open; opening another closes the previous one; clicking an open header collapses it.
4. **`allowMultiple`:** items open and close independently.
5. **`defaultValue`:** the items to open on mount.
6. `AccordionItem` outside `Accordion` throws an error mentioning `Accordion`.

**What the interviewer is looking for:** a state shape that makes both modes trivial, the context + throwing-hook pattern, explicit `value`s rather than indices, and correct ARIA wiring. Talk through the single vs multiple decision before you type.
