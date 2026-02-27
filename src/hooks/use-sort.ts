import { useMemo, useState } from "react";

export type SortOrder = "asc" | "desc";

export interface SortOption<TItem, TKey extends string> {
  key: TKey;
  label: string;
  compare: (a: TItem, b: TItem) => number;
}

interface UseSortParams<TItem, TKey extends string> {
  items: TItem[];
  options: SortOption<TItem, TKey>[];
  initialSortBy: TKey;
  initialSortOrder?: SortOrder;
}

export function useSort<TItem, TKey extends string>({
  items,
  options,
  initialSortBy,
  initialSortOrder = "desc",
}: UseSortParams<TItem, TKey>) {
  const [sortBy, setSortBy] = useState<TKey>(initialSortBy);
  const [sortOrder, setSortOrder] = useState<SortOrder>(initialSortOrder);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const sortedItems = useMemo(() => {
    const option = options.find((opt) => opt.key === sortBy);
    if (!option) return items;

    const sorted = [...items].sort((a, b) => {
      const result = option.compare(a, b);
      return sortOrder === "asc" ? result : -result;
    });

    return sorted;
  }, [items, options, sortBy, sortOrder]);

  const sortLabel = useMemo(() => {
    const option = options.find((opt) => opt.key === sortBy);
    return option?.label ?? "Sort";
  }, [options, sortBy]);

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  return {
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    showSortDropdown,
    setShowSortDropdown,
    sortedItems,
    sortLabel,
    toggleSortOrder,
  };
}
