export function parseDuration(input: string): number | null {
  const value = input.trim();

  // 1. Digits only: "259" means 259 seconds
  if (/^\d+$/.test(value)) {
    return Number.parseInt(value, 10);
  }

  // 2. Hours, minutes and seconds: "4:19:30"
  const hoursMatch = value.match(/^(\d+):(\d+):(\d+)$/);

  if (hoursMatch) {
    const hours = Number.parseInt(hoursMatch[1], 10);
    const minutes = Number.parseInt(hoursMatch[2], 10);
    const seconds = Number.parseInt(hoursMatch[3], 10);

    return hours * 3600 + minutes * 60 + seconds;
  }

  // 3. Minutes and seconds: "4:19" or "4.19"
  const timeMatch = value.match(/^(\d+)[:.](\d+)$/);

  if (timeMatch) {
    const minutes = Number.parseInt(timeMatch[1], 10);

    let secondsText = timeMatch[2];

    // For decimal input, use only the first two digits
    // and pad a single digit with zero on the left.
    if (value.includes(".")) {
      secondsText = secondsText.slice(0, 2).padStart(2, "0");
    }

    const seconds = Number.parseInt(secondsText, 10);

    return minutes * 60 + seconds;
  }

  // 4. Minutes and seconds with letters: "4m19s"
  // Both m and s must be present.
  const textMatch = value.match(/^(\d*)m(\d*)s$/i);

  if (textMatch) {
    const minutes = Number.parseInt(textMatch[1] || "0", 10);
    const seconds = Number.parseInt(textMatch[2] || "0", 10);

    return minutes * 60 + seconds;
  }

  // 5. Invalid input
  return null;
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes} min ${remainingSeconds} sec`;
}