> [!CAUTION]
> このディレクトリにおけるファイル、つまり、
>
> ```sh
> frontend/drizzle/relations.ts
> frontend/drizzle/schema.ts
> ```
>
> は自動的に生成されるので、手動で編集しないでください。

スキーマを変更する場合は、`database\schema.ts`を変更した後に、以下のコマンドで更新します。

```sh
# pwd = ./frontend
pnpm run introspect
```
