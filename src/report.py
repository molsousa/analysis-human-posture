import os
from datetime import datetime
from src.config import LOG_CONFIG

class Log:
    """
    Generates a session report focused on providing useful insights to the user,
    including in which specific repetitions the errors occurred.
    """

    def __init__(self, exercise_config):
        """ Initializes the data structures to collect session statistics """
        self.dir_logs = LOG_CONFIG["dir_logs"]
        self.exercise_config = exercise_config
        self.exercise_name = exercise_config["name"]

        self.stats = {"total_reps": 0, "ok_reps": 0, "invalid_reps": 0, "errors": {}}

        timestamp_file = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        self.log_file = os.path.join(
            self.dir_logs, f"resumo_{self.exercise_name}_{timestamp_file}.txt"
        )

        self._make_dir_log()

    def _make_dir_log(self):
        """ Make a directory to save the report """
        os.makedirs(self.dir_logs, exist_ok=True)

    def save_rep(self, rep_num, rep_ok, rep_error):
        """
        Records the consolidated data from a single completed repetition.
        This method is called by PostureAnalyzer at tha end of each rep.
        
        Args:
            rep_num: total rep.
            rep_ok: True if the reptition was performed wit good posture, False otherwise.
            rep_error: A set containing the error messages that occurred in the rep.
        """
        self.stats["total_reps"] += 1
        if rep_ok:
            self.stats["ok_reps"] += 1
        else:
            self.stats["invalid_reps"] += 1
            for error in rep_error:
                if error not in self.stats["errors"]:
                    self.stats["errors"][error] = {"count": 0, "reps": []}

                self.stats["errors"][error]["count"] += 1
                self.stats["errors"][error]["reps"].append(rep_num)

    def save(self):
        """ Save the statistical summary of the session in a readable text file. """
        if self.stats["total_reps"] == 0:
            print("No reps were completed to generate the report.")
            return

        report_content = []
        report_content.append("=" * 40)
        report_content.append(f" SUMMARY OF THE TRAINING SESSION")
        report_content.append("=" * 40)
        report_content.append(f"Exercise: {self.exercise_name}")
        report_content.append(
            f"Date: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}\n"
        )

        report_content.append("--- OVERALL PERFORMANCE ---")
        report_content.append(f"Total reps: {self.stats['total_reps']}")
        report_content.append(f"  - Correct reps: {self.stats['ok_reps']}")
        report_content.append(f"  - Incorrect reps: {self.stats['invalid_reps']}")

        try:
            sucess_percent = (self.stats["ok_reps"] / self.stats["total_reps"]) * 100
            report_content.append(
                f"Success rate: {sucess_percent:.1f}%\n"
            )
        except ZeroDivisionError:
            pass

        if self.stats["invalid_reps"] > 0:
            report_content.append("--- POINTS TO IMPROVE ---")

            sorted_errors = sorted(
                self.stats["errors"].items(),
                key=lambda item: item[1]["count"],
                reverse=True,
            )

            for i, (error_message, details) in enumerate(sorted_errors):
                reps_str = ", ".join(map(str, details["reps"]))
                report_content.append(
                    f"{i+1}. {error_message} (Occurred {details['count']} time(s))"
                )
                report_content.append(f"   -> In the reps: {reps_str}")

                # Find the rule corresponding to the error message to give the correct focus
                for rule in self.exercise_config["rules"]["feedback"]:
                    if rule["message"] == error_message:
                        # Check if it is a 'zone' rule
                        if "angle" in rule:
                            angle_name = rule["angle"]
                            joints = self.exercise_config["angle_definitions"][
                                angle_name
                            ]
                            joint_names = ", ".join(joints).replace("_", " ").title()
                            report_content.append(
                                f"   -> Focus: Alignment between {joint_names}"
                            )

                        # Check if it is a 'relative' rule
                        elif "angle1" in rule and "angle2" in rule:
                            angle1_name = rule["angle1"].replace("_", " ")
                            angle2_name = rule["angle2"].replace("_", " ")
                            report_content.append(
                                f"   -> Foco: Relation between {angle1_name} e {angle2_name}"
                            )
                        break  # Found the rule, stop searching
        else:
            report_content.append("\n--- EXCELLENT! ---")
            report_content.append("You completed all repetitions with good posture!")

        # Write the content to the file
        with open(self.log_file, "w", encoding="utf-8") as f:
            f.write("\n".join(report_content))
