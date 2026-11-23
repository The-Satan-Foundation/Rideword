'use client'

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Bot, LoaderCircle, Mic, MicOff, Send, Volume2, VolumeX } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type ChatRole = 'user' | 'assistant'

type ChatMessage = {
  id: string
  role: ChatRole
  content: string
}

type RecognitionResultLike = {
  isFinal: boolean
  [index: number]: { transcript: string }
}

type RecognitionEventLike = {
  resultIndex: number
  results: ArrayLike<RecognitionResultLike>
}

type BrowserSpeechRecognition = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: RecognitionEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type SpeechWindow = Window & {
  SpeechRecognition?: new () => BrowserSpeechRecognition
  webkitSpeechRecognition?: new () => BrowserSpeechRecognition
}

function createMessageId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function CompanionChat({ companionName }: { companionName: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello, I’m ${companionName}. I can answer general questions, but I can’t access or change your identity or wallet. What would you like to talk about?`,
    },
  ])
  const [draft, setDraft] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [speakReplies, setSpeakReplies] = useState(true)
  const [voiceStatus, setVoiceStatus] = useState('Voice input is optional. Select the microphone to speak.')
  const [error, setError] = useState<string | null>(null)
  const messagesRef = useRef(messages)
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const finalTranscriptRef = useRef('')
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const speechWindow = window as SpeechWindow
    const speechAvailable = Boolean(speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition)
    setVoiceSupported(speechAvailable)
    if (!speechAvailable) setVoiceStatus('Voice input is unavailable in this browser. You can still type a message.')

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null
        recognitionRef.current.abort()
      }
      window.speechSynthesis?.cancel()
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, isLoading, isListening])

  function updateMessages(nextMessages: ChatMessage[]) {
    messagesRef.current = nextMessages
    setMessages(nextMessages)
  }

  async function sendMessage(value: string) {
    const content = value.trim()
    if (!content || isLoading) return
    if (content.length > 4_000) {
      setError('Please keep each message under 4,000 characters.')
      return
    }

    setError(null)
    const userMessage: ChatMessage = { id: createMessageId(), role: 'user', content }
    const nextMessages = [...messagesRef.current, userMessage]
    updateMessages(nextMessages)
    setDraft('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/companion/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.slice(-12).map(({ role, content: messageContent }) => ({
            role,
            content: messageContent,
          })),
        }),
      })
      const payload: unknown = await response.json().catch(() => null)
      const responseBody = payload && typeof payload === 'object' ? (payload as { text?: unknown; error?: unknown }) : null

      if (!response.ok) {
        throw new Error(typeof responseBody?.error === 'string' ? responseBody.error : 'The companion could not respond. Please try again.')
      }
      if (typeof responseBody?.text !== 'string' || !responseBody.text.trim()) {
        throw new Error('The companion returned an empty response. Please try again.')
      }

      const assistantMessage: ChatMessage = {
        id: createMessageId(),
        role: 'assistant',
        content: responseBody.text,
      }
      updateMessages([...nextMessages, assistantMessage])

      if (speakReplies && typeof SpeechSynthesisUtterance !== 'undefined') {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(assistantMessage.content)
        utterance.lang = navigator.language || 'en-US'
        window.speechSynthesis.speak(utterance)
      }
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'The companion could not respond. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  function startOrStopVoiceInput() {
    if (isListening) {
      recognitionRef.current?.stop()
      return
    }

    if (isLoading) return
    const speechWindow = window as SpeechWindow
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition
    if (!Recognition) {
      setVoiceStatus('Voice input is unavailable in this browser. You can still type a message.')
      return
    }

    setError(null)
    finalTranscriptRef.current = ''
    const recognition = new Recognition()
    recognitionRef.current = recognition
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = navigator.language || 'en-US'
    recognition.onresult = (event) => {
      let interimTranscript = ''
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        if (!result) continue
        if (result.isFinal) finalTranscriptRef.current += `${result[0].transcript} `
        else interimTranscript += result[0].transcript
      }
      setDraft(`${finalTranscriptRef.current}${interimTranscript}`.trim())
    }
    recognition.onerror = ({ error: recognitionError }) => {
      const message = recognitionError === 'not-allowed'
        ? 'Microphone access was denied. Allow microphone access in your browser to use voice input.'
        : recognitionError === 'no-speech'
          ? 'No speech was detected. Select the microphone and try again.'
          : 'Voice input stopped unexpectedly. You can try again or type your message.'
      setVoiceStatus(message)
    }
    recognition.onend = () => {
      recognitionRef.current = null
      setIsListening(false)
      const transcript = finalTranscriptRef.current.trim()
      finalTranscriptRef.current = ''
      setVoiceStatus(transcript ? 'Voice message captured.' : 'Voice input is optional. Select the microphone to speak.')
      if (transcript) void sendMessage(transcript)
    }

    try {
      recognition.start()
      setIsListening(true)
      setVoiceStatus('Listening. Select the microphone again when you’re finished.')
    } catch {
      recognitionRef.current = null
      setVoiceStatus('The microphone could not start. Check browser permissions and try again.')
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void sendMessage(draft)
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void sendMessage(draft)
    }
  }

  return (
    <Card className="overflow-hidden border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-border/60">
        <div>
          <CardTitle className="flex items-center gap-2 text-base"><Bot className="size-4 text-primary" /> Talk with {companionName}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Ask a question by text or voice.</p>
        </div>
        <Badge variant="outline" className="shrink-0 gap-2 border-success/30 bg-success/5 text-success"><span className="size-1.5 rounded-full bg-success" /> Ready</Badge>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6">
        <div className="max-h-[420px] min-h-64 space-y-4 overflow-y-auto rounded-xl border border-border/60 bg-background/50 p-4" role="log" aria-label="Conversation with your Aegis companion" aria-live="polite" aria-relevant="additions text">
          {messages.map((message) => (
            <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {message.role === 'assistant' && <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-primary"><Bot className="size-4" /></span>}
              <div className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === 'user' ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md border border-border/60 bg-card text-card-foreground'}`}>
                {message.content}
              </div>
            </div>
          ))}
          {isLoading && <div className="flex items-center gap-3 text-sm text-muted-foreground" role="status"><LoaderCircle className="size-4 animate-spin" /> Aegis is thinking…</div>}
          <div ref={bottomRef} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground" role="status" aria-live="polite">{isListening ? <span className="text-primary">{voiceStatus}</span> : voiceStatus}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => setSpeakReplies((current) => !current)} aria-pressed={speakReplies}>
            {speakReplies ? <Volume2 className="mr-2 size-4" /> : <VolumeX className="mr-2 size-4" />}
            {speakReplies ? 'Speak replies on' : 'Speak replies off'}
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <label className="sr-only" htmlFor="companion-message">Message {companionName}</label>
          <textarea
            id="companion-message"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleInputKeyDown}
            maxLength={4_000}
            rows={2}
            placeholder="Write or dictate a message…"
            className="min-h-12 flex-1 resize-none rounded-xl border border-input bg-background px-3 py-3 text-sm text-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoading || isListening}
          />
          <Button
            type="button"
            variant={isListening ? 'destructive' : 'outline'}
            size="icon"
            onClick={startOrStopVoiceInput}
            disabled={!voiceSupported || (isLoading && !isListening)}
            aria-label={isListening ? 'Stop voice input' : voiceSupported ? 'Start voice input' : 'Voice input unavailable in this browser'}
            aria-pressed={isListening}
            title={voiceSupported ? 'Voice input' : 'Voice input is not supported in this browser'}
          >
            {isListening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
          </Button>
          <Button type="submit" size="icon"             disabled={isLoading || isListening || !draft.trim()} aria-label="Send message">
            {isLoading ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </form>

        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <p className="text-xs leading-5 text-muted-foreground">Voice recognition is provided by your browser and may use its speech service. Chat text is sent to Vercel AI Gateway for a reply. This app does not save conversation history; it stays in this page until you leave.</p>
      </CardContent>
    </Card>
  )
}
