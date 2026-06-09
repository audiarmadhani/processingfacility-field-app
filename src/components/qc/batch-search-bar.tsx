"use client";

import { FormEvent, KeyboardEvent } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type BatchSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onSearch: (value: string) => void;
  placeholder?: string;
};

export function BatchSearchBar({
  value,
  onChange,
  onSearch,
  placeholder = "Search batch or experiment…",
}: BatchSearchBarProps) {
  const submitSearch = () => {
    onSearch(value.trim());
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    submitSearch();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitSearch();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        className="flex-1"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        enterKeyHint="search"
        autoComplete="off"
        aria-label="Search batches"
      />
      <Button type="submit" size="lg" className="shrink-0 gap-2 px-4">
        <Search className="h-5 w-5" />
        Search
      </Button>
    </form>
  );
}
