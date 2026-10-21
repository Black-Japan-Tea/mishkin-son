import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

/** Приложению нужен Supabase: экран честной настройки вместо заглушек (§5.3). */
export function ConfigRequiredPage(): React.JSX.Element {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md items-center p-4">
      <Card className="ambient w-full">
        <CardHeader>
          <CardTitle>Нужно настроить облако</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm leading-relaxed">
          <p>Приложение работает офлайн, но для входа и синхронизации нужен Supabase.</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              Создай проект на <span className="font-bold">supabase.com</span>.
            </li>
            <li>
              В SQL Editor выполни файлы <code className="text-xs">supabase/migrations/0001…0003</code> из репозитория.
            </li>
            <li>
              Скопируй URL и anon key в <code className="text-xs">.env</code> (образец —{" "}
              <code className="text-xs">.env.example</code>) и перезапусти.
            </li>
          </ol>
          <p className="text-muted-foreground">
            Подробности — в <code className="text-xs">README.md</code>.
          </p>
          <Link to="/login" className="text-primary underline">
            Проверить ещё раз
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
