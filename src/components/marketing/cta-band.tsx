import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/reveal";

export function CtaBand() {
  return (
    <section className="border-t border-border py-20 md:py-28">
      <div className="container">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-background p-10 text-center md:p-16">
            <div className="pointer-events-none absolute inset-0 bg-radial-accent" />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Готовы публиковать на автопилоте?
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
                Начните бесплатно — 1 публикация в день без карты. Апгрейд в
                любой момент.
              </p>
              <Button asChild size="lg" className="mt-8">
                <Link href="/register">
                  Создать аккаунт
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
