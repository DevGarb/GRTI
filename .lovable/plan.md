## Objetivo

Trocar o beep gerado por Web Audio API pelo MP3 enviado (`dragon-studio-alert-444816.mp3`).

## Alterações

1. Copiar `user-uploads://dragon-studio-alert-444816.mp3` para `src/assets/new-ticket-alert.mp3`.
2. Em `src/hooks/useNewTicketNotifier.ts`:
   - Importar o arquivo: `import alertSound from "@/assets/new-ticket-alert.mp3"`.
   - Substituir `playBeep()` por uma função que instancia um `Audio(alertSound)` e dá `play()` (com `volume` ~0.6 e tratamento silencioso de falha caso o navegador bloqueie autoplay).
   - Manter o mesmo gatilho (INSERT em tickets da org, ignorando o próprio criador).

## Fora do escopo

- Mudar lógica de quem recebe, piscar do título, ou filtros realtime.
- UI para escolher som / volume.