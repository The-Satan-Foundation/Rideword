'use client'

import { useMemo, useState } from 'react'
import { Globe2, LockKeyhole, Send, Users } from 'lucide-react'
import { useAegis } from '@/lib/store'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type Channel = 'private' | 'public'
type Message = { id: string; sender: string; text: string; channel: Channel; time: string }

const seedMessages: Message[] = [
  { id: 'm1', sender: 'aegis-zur-2', text: 'Handshake verified. Are your credential shards synced?', channel: 'private', time: '09:41' },
  { id: 'm2', sender: 'you', text: 'Synced and anchored. I can relay the latest manifest.', channel: 'private', time: '09:43' },
  { id: 'm3', sender: 'aegis-tok-7', text: 'Public mesh check-in: Tokyo edge is online.', channel: 'public', time: '09:47' },
]

export default function MessagesPage() {
  const { nodes, identity } = useAegis()
  const [channel, setChannel] = useState<Channel>('private')
  const [selectedNode, setSelectedNode] = useState(nodes.find((node) => !node.isSelf)?.id ?? '')
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState(seedMessages)
  const contacts = useMemo(() => nodes.filter((node) => !node.isSelf), [nodes])
  const visibleMessages = messages.filter((message) => message.channel === channel)

  function sendMessage() {
    const text = draft.trim()
    if (!text) return
    setMessages((current) => [...current, {
      id: crypto.randomUUID(),
      sender: 'you',
      text,
      channel,
      time: new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date()),
    }])
    setDraft('')
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Grimoir / communications</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Node messages</h1>
        <p className="mt-1 text-sm text-muted-foreground">Reach trusted nodes privately or speak to the public mesh.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <Card className="h-fit">
          <CardHeader className="border-b border-border/60 pb-3"><CardTitle className="flex items-center gap-2 text-sm"><Users className="size-4 text-primary" /> Contacts</CardTitle></CardHeader>
          <CardContent className="space-y-1 p-2">
            {contacts.length === 0 && <p className="p-3 text-xs text-muted-foreground">No nodes discovered yet.</p>}
            {contacts.slice(0, 8).map((node) => (
              <button key={node.id} onClick={() => { setSelectedNode(node.id); setChannel('private') }} className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-secondary/60', selectedNode === node.id && channel === 'private' && 'bg-primary/10')}>
                <Avatar className="size-8"><AvatarFallback className="bg-primary/10 text-[10px] text-primary">{node.label.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium">{node.label}</span><span className="block text-[10px] text-muted-foreground">{node.region}</span></span>
                <span className={cn('size-1.5 rounded-full', node.status === 'online' ? 'bg-success' : node.status === 'syncing' ? 'bg-accent' : 'bg-destructive')} />
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="flex min-h-[580px] flex-col">
          <CardHeader className="flex-row items-center justify-between border-b border-border/60 pb-4">
            <div><CardTitle className="text-sm">{channel === 'private' ? (contacts.find((node) => node.id === selectedNode)?.label ?? 'Private node') : 'Public mesh'}</CardTitle><p className="mt-1 text-xs text-muted-foreground">{channel === 'private' ? 'End-to-end node channel' : 'Visible to connected nodes'}</p></div>
            <div className="flex rounded-lg border border-border bg-secondary/30 p-1"><Button size="sm" variant={channel === 'private' ? 'secondary' : 'ghost'} onClick={() => setChannel('private')}><LockKeyhole className="mr-1.5 size-3.5" /> Private</Button><Button size="sm" variant={channel === 'public' ? 'secondary' : 'ghost'} onClick={() => setChannel('public')}><Globe2 className="mr-1.5 size-3.5" /> Public</Button></div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col p-0">
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {visibleMessages.map((message) => <div key={message.id} className={cn('flex max-w-[80%] flex-col gap-1', message.sender === 'you' && 'ml-auto items-end')}><div className={cn('rounded-2xl px-4 py-3 text-sm', message.sender === 'you' ? 'bg-primary text-primary-foreground' : 'bg-secondary/60')}><p className="leading-relaxed">{message.text}</p></div><span className="px-1 font-mono text-[10px] text-muted-foreground">{message.sender} · {message.time}</span></div>)}
              {visibleMessages.length === 0 && <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No messages in this channel yet.</div>}
            </div>
            <div className="border-t border-border/60 p-4"><div className="flex gap-2"><Input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.keyCode !== 229) sendMessage() }} placeholder={channel === 'private' ? `Message ${contacts.find((node) => node.id === selectedNode)?.label ?? 'node'}…` : 'Broadcast to the public mesh…'} aria-label="Message" /><Button onClick={sendMessage} aria-label="Send message"><Send className="size-4" /></Button></div><div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground"><span>{channel === 'private' ? 'Encrypted on the mesh' : 'Public relay'}</span><Badge variant="outline" className="font-mono text-[9px]">{identity?.handle ?? 'node'}</Badge></div></div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
