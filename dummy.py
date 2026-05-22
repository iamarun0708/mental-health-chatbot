import httpx
import asyncio
import random
import sys

import os

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

GROQ_API_URL = "groq url"

async def fetch_reply(messages, max_tokens=600):
    """Fetch full response from Groq API"""
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": max_tokens
    }
    async with httpx.AsyncClient(timeout=None) as client:
        try:
            resp = await client.post(GROQ_API_URL, headers=headers, json=payload)
            if resp.status_code != 200:
                return f"⚠️ Error: {resp.text}"
            data = resp.json()
            return data["choices"][0]["message"]["content"]
        except Exception as e:
            return f"⚠️ Error connecting to API: {e}"

async def natural_typing(text):
    """Type text character by character with natural pauses."""
    for char in text:
        print(char, end='', flush=True)
        if char in ".!?":
            await asyncio.sleep(random.uniform(0.1, 0.2))
        elif char in ",;:":
            await asyncio.sleep(random.uniform(0.05, 0.1))
        else:
            await asyncio.sleep(random.uniform(0.01, 0.03))
    print()  # newline at the end

async def main():
    print("🧘 CalmMind — Natural Typing Mental Health Chatbot\n(Type 'exit' to quit)\n")

    messages = [
        {"role": "system", "content": (
            "You are CalmMind, a compassionate AI mental health companion. "
            "Respond fully, empathetically, and concisely (<150 words). "
            "Give supportive advice, coping strategies, or suggest a doctor if needed. "
            "End each message with a comforting note like 'You're not alone.'"
        )}
    ]

    while True:
        try:
            user = input("You: ").strip()
            if user.lower() == "exit":
                print("🕊️ CalmMind: Take care of yourself. Goodbye.")
                break

            messages.append({"role": "user", "content": user})
            print("\nCalmMind is typing...\n")  # blinking removed, simple static indicator

            reply = await fetch_reply(messages, max_tokens=600)
            await natural_typing(reply)  # types letter by letter

            messages.append({"role": "assistant", "content": reply})
            messages = messages[-10:]  # keep last 10 messages for context

        except KeyboardInterrupt:
            print("\n🕊️ CalmMind: Session ended. Take care!")
            break
        except Exception as e:
            print(f"\n⚠️ Error: {e}")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🕊️ CalmMind: Goodbye!")