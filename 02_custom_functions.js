// Here, you can define all custom functions, you want to use and initialize some variables

/* Variables
*
*
*/
const coin = _.sample(["head", "tail"]); // You can determine global (random) parameters here
// Declare your variables here

// const temp_data = {
//                     trial_name: "help",
//                     trial_number: -1,
//                     doc_page_time: 2,
//                     trial_time: Date.now(),
//                     rand_worker_num: -1,
//                     guid_idx: -1,
//                     response_id: -1,
//                     response_alias: "me",
//                     response_cand_qid: "please",
//                     response_alias_idx: -1,
//                     span_l: -1,
//                     response_sent_idx: -1,
//                     response_doc_title: "please",
//                     is_gold_example: false,
//                     metadata_links_clicked: [],
//                 };

// $.ajax({
//     type: 'POST',
//     url: 'https://nel-data-collection.herokuapp.com/api/submit_experiment/1',
//     // url: 'http://localhost:4000/api/submit_experiment',
//     crossDomain: true,
//     contentType: 'application/json',
//     data: JSON.stringify(temp_data),
//     success: function(responseData, textStatus, jqXHR) {
//       alert('Successful submission.');
//     },
//     error: function(responseData, textStatus, errorThrown) {
//       alert('Submission failed.' + JSON.stringify(responseData));
//     }
//   });
//
// $.ajax({
//   type: 'GET',
//   url: 'https://nel-data-collection.herokuapp.com/api/retrieve_experiment/1',
//   crossDomain: true,
//   success: function(responseData, textStatus, jqXHR) {
//     console.table(responseData);
//   }
// });
// debugger;
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

// Chunk mention lists - wrapping around if one is less than 9 candidates and there are others we can add
slice_mentions = function(ned_info, user_id) {
    ned_info.forEach(function(doc, doc_idx) {
        ned_info[doc_idx].mentions.forEach(function(mention, mention_idx) {
            // Mentions are pre-shuffled
            const men_chunks = _.chunk(mention.candidates, 9);
            const men_title_chunks = _.chunk(mention.candidate_titles, 9);
            const men_desc_chunks = _.chunk(mention.candidate_descriptions, 9);
            if (men_chunks.length > 1 && men_chunks[men_chunks.length-1].length < 9) {
                var i = 0;
                while (men_chunks[men_chunks.length-1].length < 9) {
                    men_chunks[men_chunks.length-1].push(mention.candidates[i]);
                    men_title_chunks[men_title_chunks.length-1].push(mention.candidate_titles[i]);
                    men_desc_chunks[men_desc_chunks.length-1].push(mention.candidate_descriptions[i]);
                    i += 1;
                }
            }
            ned_info[doc_idx].mentions[mention_idx].candidates = men_chunks[user_id%men_chunks.length];
            ned_info[doc_idx].mentions[mention_idx].candidate_titles = men_title_chunks[user_id%men_chunks.length];
            ned_info[doc_idx].mentions[mention_idx].candidate_descriptions = men_desc_chunks[user_id%men_chunks.length];
        });
    });
    return ned_info
}

const worker_rand_num = _.random(0, 1000)

var global_docs_so_far = 0;

/* Generators for custom view templates, answer container elements and enable response functions
*
*
*/

