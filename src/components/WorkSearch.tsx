import { useEffect, useState } from "react";

export function WorkSearch({ value, onSearch, privateView = false }: { value: string; onSearch: (query: string) => void; privateView?: boolean }) {
  const [query, setQuery] = useState(value);
  useEffect(() => setQuery(value), [value]);
  return <form className="work-search" role="search" onSubmit={event => { event.preventDefault(); onSearch(query.trim()); }}>
    <label>查找作品<input type="search" value={query} maxLength={100} placeholder={privateView ? "标题、简介、昵称或用户名" : "标题、简介或创作者昵称"} onChange={event => setQuery(event.target.value)} /></label>
    <button className="primary">搜索</button>
    {(value || query) && <button type="button" onClick={() => { setQuery(""); onSearch(""); }}>清除搜索</button>}
  </form>;
}
