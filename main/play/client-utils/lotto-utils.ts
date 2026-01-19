function playLotto(numTickets: number) {

    for (let i = 0; i < 1; i++) {
        // Mega Millions is 5@1/70 + 1@1/25
        // Powerball is 5@1/69 + 1@1/26
        // let matchedNums = []
        // let odds: bigint = 79n * 69n * 68n * 67n * 66n * 25n;
        let rand = Math.floor(Math.random() * 70 * 69 * 68 * 67 * 66 * 25 / numTickets);
        // console.log("Well... " + rand + " is what we got.")
        if (rand === 0) {
            console.log("THAT'S A WINNER! One of the tickets we bought this drawing won.");
            return true;
        }
    }

    return false;
}

function exponentialShouldLog(exp: number) {
    const expStr = String(exp)
    if (expStr.length < 4) return false;
    if (!["1"].includes(expStr.charAt(0))) return false;
    for (const char of expStr.substring(1)) {
        if (char !== "0") return false;
    }
    return true;
}

export function playUntilJackpot() {
    
    const resultsEl = document.getElementById("results") as HTMLParagraphElement;
    const numTicketPicker: HTMLInputElement = document.getElementById("numTickets") as HTMLInputElement;
    const numTicketsStr: string = numTicketPicker.value;
    if (numTicketsStr.trim() === '' || !Number.isFinite(+numTicketsStr)) {
        throw Error("Input value was not a number.");
    }
    const numPeoplePicker: HTMLInputElement = document.getElementById("numPeople") as HTMLInputElement;
    const numPeopleStr: string = numPeoplePicker.value;
    if (numPeopleStr.trim() === '' || !Number.isFinite(+numPeopleStr)) {
        throw Error("Input value was not a number.");
    }
    const totalNumTickets: number = Number(numTicketsStr) * (Number(numPeopleStr) + 1);
    const numTickets: number = Number(numTicketsStr);
    let numDrawings = 0;
    let isJackpot = false;
    
    console.log(`Starting to play until we hit a jackpot...`)
    while (isJackpot === false) {
        numDrawings += 1;
        isJackpot = playLotto(totalNumTickets);
        if (exponentialShouldLog(numDrawings)) {
            const result = "Still no jackpot. Passing " + numDrawings + " drawings..."
            // console.log(result);
            const intermediateResult = document.createElement("div");
            intermediateResult.innerText = result;
            resultsEl.appendChild(intermediateResult);
        }
    }

    const result = "Woo! we got a jackpot and it only took " + numDrawings + 
        " drawings with " + totalNumTickets + " tickets each. " + (1 - (numTickets / totalNumTickets)) + 
        "% of those tickets were donated to you for free! At three drawings per week, it took us " + 
        (Math.floor(numDrawings / 156)) + " years and " + (Math.floor((numDrawings % 156) / 3)) + " weeks, " + 
        "or about " + (numDrawings / 9360) + " gambling lifetimes, to hit the jackpot. " + 
        "During that time, you and your benefactors were spending $" + (totalNumTickets * 2) + 
        " per drawing, or $" + (totalNumTickets * 2 * 156) +
        " per year. In total, we spent $" + (numDrawings * totalNumTickets * 2) + " to finally win.";
    // console.log(result);
    // resultsEl.innerText = result;
    const finalResult = document.createElement("div");
    finalResult.innerText = result;
    resultsEl.appendChild(finalResult);
}