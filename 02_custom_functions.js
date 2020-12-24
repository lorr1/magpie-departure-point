// Here, you can define all custom functions, you want to use and initialize some variables

/* Variables
*
*
*/
const coin = _.sample(["head", "tail"]); // You can determine global (random) parameters here
// Declare your variables here



/* Helper functions
*
*
*/


/* For generating random participant IDs */
    // https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
// dec2hex :: Integer -> String
const dec2hex = function(dec) {
    return ("0" + dec.toString(16)).substr(-2);
};
// generateId :: Integer -> String
const generateID = function(len) {
    let arr = new Uint8Array((len || 40) /2);
    window.crypto.getRandomValues(arr);
    return Array.from(arr, this.dec2hex).join("");
};
// Declare your helper functions here



/* Hooks  
*
*
*/

// Error feedback if participants exceeds the time for responding
const time_limit = function(data, next) {
    if (typeof window.timeout === 'undefined'){
        window.timeout = [];
    }
    // Add timeouts to the timeoutarray
    // Reminds the participant to respond after 5 seconds
    window.timeout.push(setTimeout(function(){
          $('#reminder').text('Please answer more quickly!');
    }, 5000));
    next();
};

// compares the chosen answer to the value of `option1`
check_response = function(data, next) {
    $('input[name=answer]').on('change', function(e) {
        if (e.target.value === data.correct) {
            alert('Your answer is correct! Yey!');
        } else {
            alert('Sorry, this answer is incorrect :( The correct answer was ' + data.correct);
        }
        next();
    })
}

// Declare your hooks here
convert_wikipedia_title = function(title) {
    return title.replace(" ", "_")
}

slice_mentions = function(ned_info, user_id) {
    ned_info.forEach(function(doc, doc_idx) {
        ned_info[doc_idx].mentions.forEach(function(mention, mention_idx) {
            // Mentions are pre-shuffled
            const men_chunks = _.chunk(mention.candidates, 9);
            ned_info[doc_idx].mentions[mention_idx].candidates = men_chunks[user_id%men_chunks.length];
            ned_info[doc_idx].mentions[mention_idx].candidate_titles = _.chunk(mention.candidate_titles, 9)[user_id%men_chunks.length];
            ned_info[doc_idx].mentions[mention_idx].candidate_descriptions = _.chunk(mention.candidate_descriptions, 9)[user_id%men_chunks.length];
        });
    });
    return ned_info
}

const worker_rand_num = _.random(0, 1000)

/* Generators for custom view templates, answer container elements and enable response functions
*
*
*/

