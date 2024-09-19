document.addEventListener('DOMContentLoaded', function () {
    const addMemberForm = document.getElementById('add-member-form');
    const nameInput = document.getElementById('name-input');
    const timezoneSelect = document.getElementById('timezone-select');
    const profilePicInput = document.getElementById('profile-pic-input');
    const teamList = document.getElementById('team-list');
    const toggleFormBtn = document.getElementById('toggle-form-btn');
    const addButton = document.getElementById('add-button');
    const nameWarning = document.getElementById('name-warning');
    const timezoneWarning = document.getElementById('timezone-warning');
    const darkModeToggle = document.getElementById('dark-mode-toggle');

    // Load team members from chrome.storage.local
    let teamMembers = [];

    chrome.storage.local.get({ teamMembers: [] }, function (result) {
        teamMembers = result.teamMembers;
        displayTeamMembers();
    });

    // Load dark mode preference from storage
    chrome.storage.local.get({ darkMode: false }, function (result) {
        if (result.darkMode) {
            document.body.classList.add('dark-mode');
            darkModeToggle.checked = true;
        }
    });

    // Toggle dark mode
    darkModeToggle.addEventListener('change', function() {
        document.body.classList.toggle('dark-mode');
        chrome.storage.local.set({ darkMode: this.checked });
    });

    function saveTeamMembers() {
        chrome.storage.local.set({ teamMembers: teamMembers });
    }

    function addTeamMember(name, timezone, profilePic) {
        teamMembers.push({ name, timezone, profilePic });
        saveTeamMembers();
        displayTeamMembers();
    }

    function removeTeamMember(index) {
        teamMembers.splice(index, 1);
        saveTeamMembers();
        displayTeamMembers();
    }

    function getCurrentTime(timezone) {
        try {
            const now = new Date();
            const options = { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false, timeZoneName: 'short' };
            return now.toLocaleString('en-US', options);
        } catch (error) {
            console.error("Error getting time for timezone:", timezone, error);
            return "Time unavailable";
        }
    }

    function displayTeamMembers() {
        teamList.innerHTML = '';
        teamMembers.forEach((member, index) => {
            const memberElement = document.createElement('div');
            memberElement.className = 'team-member';
            memberElement.draggable = true;
            memberElement.dataset.index = index;
            const currentTime = getCurrentTime(member.timezone);
            const [time, zoneName] = currentTime.split(' ');

            const profilePicSrc = member.profilePic || 'icons/default-profile.png';

            memberElement.innerHTML = `
                <span class="drag-handle">☰</span>
                <img src="${profilePicSrc}" alt="${member.name}" class="profile-pic">
                <div class="member-info">
                    <div class="member-name">${member.name}</div>
                    <div class="member-time">
                        ${time} <span class="timezone-abbr">${zoneName}</span>
                    </div>
                    <div class="member-timezone">${member.timezone}</div>
                </div>
                <button class="remove-btn" data-index="${index}">×</button>
            `;
            teamList.appendChild(memberElement);
        });

        addDragAndDropListeners();
    }

    function addDragAndDropListeners() {
        const teamMembers = document.querySelectorAll('.team-member');
        teamMembers.forEach(member => {
            member.addEventListener('dragstart', dragStart);
            member.addEventListener('dragend', dragEnd);
        });

        teamList.addEventListener('dragover', dragOver);
        teamList.addEventListener('drop', drop);
    }

    function dragStart(e) {
        if (e.target.classList.contains('remove-btn') || e.target.classList.contains('profile-pic')) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData('text/plain', e.target.closest('.team-member').dataset.index);
        e.target.closest('.team-member').classList.add('dragging');
        setTimeout(() => e.target.closest('.team-member').classList.add('drag-ghost'), 0);
    }

    function dragEnd(e) {
        e.target.classList.remove('dragging', 'drag-ghost');
    }

    function dragOver(e) {
        e.preventDefault();
        const draggingElement = document.querySelector('.dragging');
        const closestElement = getClosestElement(teamList, e.clientY);
        
        if (closestElement) {
            teamList.insertBefore(draggingElement, closestElement);
        } else {
            teamList.appendChild(draggingElement);
        }
    }

    function getClosestElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.team-member:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    function drop(e) {
        e.preventDefault();
        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
        const toIndex = Array.from(teamList.children).indexOf(document.querySelector('.dragging'));
        
        if (fromIndex !== toIndex) {
            const [movedMember] = teamMembers.splice(fromIndex, 1);
            teamMembers.splice(toIndex, 0, movedMember);
            saveTeamMembers();
            displayTeamMembers();
        }
    }

    // Update the time every minute
    setInterval(displayTeamMembers, 60000);

    // Toggle form visibility
    toggleFormBtn.addEventListener('click', function() {
        addMemberForm.classList.toggle('expanded');
        if (addMemberForm.classList.contains('expanded')) {
            toggleFormBtn.textContent = 'Hide Form';
        } else {
            toggleFormBtn.textContent = 'Add New Member';
        }
    });

    addButton.addEventListener('click', (e) => {
        const name = nameInput.value.trim();
        const timezone = timezoneSelect.value;
        const profilePicFile = profilePicInput.files[0];

        // Reset warnings
        nameWarning.style.display = 'none';
        timezoneWarning.style.display = 'none';

        let isValid = true;

        if (!name) {
            nameWarning.textContent = 'Please enter a name';
            nameWarning.style.display = 'block';
            isValid = false;
        }

        if (!timezone) {
            timezoneWarning.textContent = 'Please select a timezone';
            timezoneWarning.style.display = 'block';
            isValid = false;
        }

        if (isValid) {
            if (profilePicFile) {
                const reader = new FileReader();
                reader.onload = function (event) {
                    addTeamMember(name, timezone, event.target.result);
                };
                reader.readAsDataURL(profilePicFile);
            } else {
                addTeamMember(name, timezone, null);
            }
            nameInput.value = '';
            timezoneSelect.value = '';
            profilePicInput.value = '';
            addMemberForm.classList.remove('expanded');
            toggleFormBtn.textContent = 'Add New Member';
        }
    });

    teamList.addEventListener('click', function (e) {
        const removeBtn = e.target.closest('.remove-btn');
        if (removeBtn) {
            const index = removeBtn.getAttribute('data-index');
            removeTeamMember(parseInt(index));
        }
    });
});
