export async function getOracleResponse(
  userMessage: string,
  conversationHistory: { role: 'user' | 'oracle'; text: string }[]
): Promise<string> {
  try {
    const response = await fetch('/api/oracle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userMessage,
        conversationHistory,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return data.message || "A disturbance in the magical realm prevents my response. Please try again shortly."
    }

    return data.response
  } catch (error) {
    console.error('Oracle error:', error)
    return "The connection to the mystical realm has been interrupted. Please check your internet connection and try again."
  }
}
